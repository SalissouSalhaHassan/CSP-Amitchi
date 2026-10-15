"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, GraduationCap, Bookmark, BookOpen, Link as LinkIcon, Loader2, Bell, FileUp, Search, Pencil, Building2, Layers, MapPin, Plus, Check, Sparkles, Filter, CheckCircle2, X, AlertTriangle, ChevronRight, Hash, Lock, Unlock, Award } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  createSession, deleteSession, setActiveSession, toggleSessionLock,
  createClass, updateClass, deleteClass, 
  createSection, updateSection, deleteSection, 
  createSubject, deleteSubject, importSubjects,
  linkSubjectToSection, updateSectionSubjectLink, deleteSectionSubjectLink,
  addClassSubjectLink, updateClassSubjectLink, deleteClassSubjectLink,
  clearAllSectionSubjectLinks, clearAllClassSubjectLinks, clearAllAcademicSubjectLinks,
  createGradingAppreciation, deleteGradingAppreciation,
  createSchoolRemark, deleteSchoolRemark,
  createPeriod, deletePeriod, updatePeriod, togglePeriodLock, handlePeriodExtensionRequest, getPeriodExtensionRequests, promoteClassStudents,
  createEducationalLevel, deleteEducationalLevel, createCanevasReferenceItem, deleteCanevasReferenceItem
} from "@/domains/academics/actions/academics.actions";

export function AcademicSettings({ 
  initialSessions, 
  initialClasses, 
  initialSections, 
  initialSubjects, 
  initialSectionSubjects,
  initialClassSubjects,
  initialGradingAppreciations,
  initialSchoolRemarks,
  initialPeriods,
  initialEducationalLevels,
  initialCanevasReferences,
  canEdit = true
}: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Local reactive states for Instant/Optimistic 0ms UI updates
  const [sessionsList, setSessionsList] = useState(initialSessions || []);
  const [classesList, setClassesList] = useState(initialClasses || []);
  const [sectionsList, setSectionsList] = useState(initialSections || []);
  const [subjectsList, setSubjectsList] = useState(initialSubjects || []);
  const [sectionSubjectsList, setSectionSubjectsList] = useState(initialSectionSubjects || []);
  const [classSubjectsList, setClassSubjectsList] = useState(initialClassSubjects || []);
  const [periodsList, setPeriodsList] = useState(initialPeriods || []);
  const [gradingList, setGradingList] = useState(initialGradingAppreciations || []);
  const [remarksList, setRemarksList] = useState(initialSchoolRemarks || []);
  const [educationalLevelsList, setEducationalLevelsList] = useState(initialEducationalLevels || []);

  useEffect(() => { setSessionsList(initialSessions || []); }, [initialSessions]);
  useEffect(() => { setClassesList(initialClasses || []); }, [initialClasses]);
  useEffect(() => { setSectionsList(initialSections || []); }, [initialSections]);
  useEffect(() => { setSubjectsList(initialSubjects || []); }, [initialSubjects]);
  useEffect(() => { setSectionSubjectsList(initialSectionSubjects || []); }, [initialSectionSubjects]);
  useEffect(() => { setClassSubjectsList(initialClassSubjects || []); }, [initialClassSubjects]);
  useEffect(() => { setPeriodsList(initialPeriods || []); }, [initialPeriods]);
  useEffect(() => { setGradingList(initialGradingAppreciations || []); }, [initialGradingAppreciations]);
  useEffect(() => { setRemarksList(initialSchoolRemarks || []); }, [initialSchoolRemarks]);
  useEffect(() => { setEducationalLevelsList(initialEducationalLevels || []); }, [initialEducationalLevels]);

  const clearAcademicFilterCache = () => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem("academic_filter_options_v2");
      }
    } catch (e) {
      console.warn("Failed to clear filter storage:", e);
    }
  };

  useEffect(() => {
    clearAcademicFilterCache();
  }, [sessionsList, classesList, sectionsList, subjectsList, sectionSubjectsList, classSubjectsList, periodsList]);

  // Form states
  const [sessionName, setSessionName] = useState("");
  const [className, setClassName] = useState("");
  const [classSectionId, setClassSectionId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [scolarite, setScolarite] = useState("");
  const [inscription, setInscription] = useState("");
  const [coges, setCoges] = useState("");
  const [transport, setTransport] = useState("");
  const [ancienSolde, setAncienSolde] = useState("");
  const [statutInitial, setStatutInitial] = useState("");
  
  // Edit class states
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassSectionId, setEditClassSectionId] = useState("");
  const [editRoomName, setEditRoomName] = useState("");
  const [editScolarite, setEditScolarite] = useState("");
  const [editInscription, setEditInscription] = useState("");
  const [editCoges, setEditCoges] = useState("");
  const [editTransport, setEditTransport] = useState("");
  const [editAncienSolde, setEditAncienSolde] = useState("");
  const [editStatutInitial, setEditStatutInitial] = useState("");
  
  // Period states — default to "all" to immediately display all periods without filter gaps on refresh
  const [periodName, setPeriodName] = useState("");
  const [periodType, setPeriodType] = useState("Trimestre");
  const [periodSessionId, setPeriodSessionId] = useState("");
  const [periodStartDate, setPeriodStartDate] = useState("");
  const [periodEndDate, setPeriodEndDate] = useState("");
  const [selectedPeriodSessionId, setSelectedPeriodSessionId] = useState<string>("all");
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [extensionRequests, setExtensionRequests] = useState<any[]>([]);

  useEffect(() => {
    if (sessionsList && sessionsList.length > 0) {
      const active = sessionsList.find((s: any) => s.isActive) || sessionsList[0];
      if (active && (!periodSessionId || periodSessionId === "")) {
        setPeriodSessionId(active.id.toString());
      }
    }
    getPeriodExtensionRequests().then((res: any) => {
      if (res && Array.isArray(res.data)) {
        setExtensionRequests(res.data);
      }
    });
  }, [sessionsList]);

  const [promoSourceClassId, setPromoSourceClassId] = useState("");
  const [promoTargetClassId, setPromoTargetClassId] = useState("");
  const [promoTargetSessionId, setPromoTargetSessionId] = useState("");

  const [sectionName, setSectionName] = useState("");
  const [sectionLevel, setSectionLevel] = useState("");
  
  // Section Edit states
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionLevel, setEditSectionLevel] = useState("");
  const [editMinPassingGrade, setEditMinPassingGrade] = useState("10");
  const [editRedoublementThreshold, setEditRedoublementThreshold] = useState("8");
  const [editExclusionThreshold, setEditExclusionThreshold] = useState("5");
  const [editNumTerms, setEditNumTerms] = useState(3);
  const [editTermLabels, setEditTermLabels] = useState("");

  const [subjectName, setSubjectName] = useState("");
  const [levelName, setLevelName] = useState("");
  const [canevasTypeName, setCanevasTypeName] = useState("");
  const [canevasCycleName, setCanevasCycleName] = useState("");
  const [canevasCommuneName, setCanevasCommuneName] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectNiveau, setSubjectNiveau] = useState("");
  const [subjectSectionId, setSubjectSectionId] = useState("");
  
  // Link states
  const [linkSectionId, setLinkSectionId] = useState("");
  const [linkPeriod, setLinkPeriod] = useState("Tous");
  const [linkSubjectId, setLinkSubjectId] = useState("");
  const [linkCoef, setLinkCoef] = useState("1");
  const [linkEliminatory, setLinkEliminatory] = useState(false);
  const [sectionSubjectSearch, setSectionSubjectSearch] = useState("");
  const [sectionSubjectFilterSection, setSectionSubjectFilterSection] = useState("all");
  const [showSectionLinkBuilder, setShowSectionLinkBuilder] = useState(false);

  // Plan d'études states
  const [planClassId, setPlanClassId] = useState("");
  const [planSubjectId, setPlanSubjectId] = useState("");
  const [planCoef, setPlanCoef] = useState("1");
  const [classPlanSearch, setClassPlanSearch] = useState("");
  const [selectedClassForModal, setSelectedClassForModal] = useState<any | null>(null);

  // Edit section-subject link states
  const [editingSectionLink, setEditingSectionLink] = useState<any | null>(null);
  const [editLinkSectionId, setEditLinkSectionId] = useState("");
  const [editLinkPeriod, setEditLinkPeriod] = useState("Tous");
  const [editLinkSubjectId, setEditLinkSubjectId] = useState("");
  const [editLinkCoef, setEditLinkCoef] = useState("1");
  const [editLinkEliminatory, setEditLinkEliminatory] = useState(false);

  // Edit class-subject link states
  const [editingClassSubject, setEditingClassSubject] = useState<any | null>(null);
  const [editClassCoef, setEditClassCoef] = useState("1");
  const [editClassSubjectId, setEditClassSubjectId] = useState("");

  // Grading states
  const [gradingName, setGradingName] = useState("");
  const [gradingScore, setGradingScore] = useState("10");

  // Remark states
  const [remarkCategory, setRemarkCategory] = useState("Conduite");
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkSectionId, setRemarkSectionId] = useState("");

  const handleCreateSession = () => {
    if (!sessionName) return;
    const tempName = sessionName.trim();
    const tempId = Date.now();
    setSessionsList((prev: any[]) => [...prev, { id: tempId, sessionName: tempName, isActive: false, status: "Inactif" }]);
    setSessionName("");
    startTransition(async () => {
      const res = await createSession(tempName);
      if (res.success) {
        toast.success(`Année scolaire "${tempName}" ajoutée avec succès`);
        router.refresh();
      } else {
        setSessionsList((prev: any[]) => prev.filter((s: any) => s.id !== tempId));
        toast.error(res.error || "Erreur lors de l'ajout de l'année scolaire");
      }
    });
  };

  const startEditPeriod = (p: any) => {
    setEditingPeriodId(p.id);
    setPeriodName(p.name);
    setPeriodType(p.periodType || p.period_type || "Trimestre");
    const sid = p.sessionId ?? p.session_id;
    setPeriodSessionId(sid ? sid.toString() : "");
    setPeriodStartDate(p.startDate || p.start_date ? new Date(p.startDate || p.start_date).toISOString().split('T')[0] : "");
    setPeriodEndDate(p.endDate || p.end_date ? new Date(p.endDate || p.end_date).toISOString().split('T')[0] : "");
  };

  const handleCreatePeriod = () => {
    if (!periodName || !periodType) return;

    // Validate: endDate must be after startDate
    if (periodStartDate && periodEndDate && periodEndDate <= periodStartDate) {
      toast.error("⚠️ La Date de Fin doit être postérieure à la Date de Début.");
      return;
    }

    const activeSessionObj = sessionsList?.find((s: any) => s.isActive) || sessionsList?.[0];
    const targetSessionId = periodSessionId 
      ? Number(periodSessionId) 
      : (selectedPeriodSessionId && selectedPeriodSessionId !== "all" 
          ? Number(selectedPeriodSessionId) 
          : (activeSessionObj?.id || null));

    startTransition(async () => {
      if (editingPeriodId) {
        const res = await updatePeriod(editingPeriodId, {
          name: periodName.trim(),
          periodType: periodType,
          sessionId: targetSessionId,
          isActive: true,
          startDate: periodStartDate || null,
          endDate: periodEndDate || null,
        });
        if (res.success) {
          toast.success("Période / Séquence mise à jour avec succès");
          const sessionObj = sessionsList?.find((s: any) => s.id === targetSessionId);
          setPeriodsList((prev: any[]) => prev.map((p: any) => p.id === editingPeriodId ? { 
            ...p, 
            name: periodName.trim(), 
            periodType: periodType, 
            sessionId: targetSessionId,
            session_id: targetSessionId,
            startDate: periodStartDate || null,
            start_date: periodStartDate || null,
            endDate: periodEndDate || null,
            end_date: periodEndDate || null,
            session: sessionObj || p.session
          } : p));
          setEditingPeriodId(null);
          setPeriodName("");
          setPeriodStartDate("");
          setPeriodEndDate("");
          router.refresh();
        } else {
          toast.error(res.error || "Erreur lors de la modification de la période");
        }
      } else {
        const res = await createPeriod({ 
          name: periodName.trim(), 
          periodType: periodType, 
          sessionId: targetSessionId,
          isActive: true,
          startDate: periodStartDate || null,
          endDate: periodEndDate || null,
        });
        if (res.success) {
          const createdObj = (res.data as any)?.data || res.data;
          const alreadyExisted = (createdObj as any)?._alreadyExisted === true;
          if (createdObj && createdObj.id && !alreadyExisted) {
            const sessionObj = sessionsList?.find((s: any) => s.id === targetSessionId);
            const fullObj = { 
              ...createdObj, 
              sessionId: createdObj.sessionId ?? createdObj.session_id ?? targetSessionId, 
              session_id: createdObj.session_id ?? createdObj.sessionId ?? targetSessionId, 
              startDate: periodStartDate || null,
              endDate: periodEndDate || null,
              session: sessionObj 
            };
            setPeriodsList((prev: any[]) => {
              const exists = prev.some((p: any) => p.id === fullObj.id);
              return exists ? prev : [...prev, fullObj];
            });
            toast.success(`Période / Séquence "${createdObj.name || periodName}" créée avec succès`);
            setPeriodName("");
            setPeriodStartDate("");
            setPeriodEndDate("");
            router.refresh();
          } else if (alreadyExisted) {
            toast.warning(`La période "${periodName}" existe déjà pour cette année scolaire.`);
          } else {
            toast.success(`Période / Séquence "${periodName}" créée avec succès`);
            setPeriodName("");
            setPeriodStartDate("");
            setPeriodEndDate("");
            router.refresh();
          }
        } else {
          toast.error(res.error || "Erreur lors de la création de la période");
        }
      }
    });
  };

  const handleGeneratePresetPeriods = (type: "Primaire" | "CollegeLycee" | "Superior" | "Sequences6" | "Sequences4") => {
    startTransition(async () => {
      let periodsToCreate: { name: string; periodType: string }[] = [];
      if (type === "Primaire") {
        periodsToCreate = [
          { name: "1er Trimestre", periodType: "Trimestre" },
          { name: "2ème Trimestre", periodType: "Trimestre" },
          { name: "3ème Trimestre", periodType: "Trimestre" },
        ];
      } else if (type === "CollegeLycee") {
        periodsToCreate = [
          { name: "1er Semestre", periodType: "Semestre" },
          { name: "2ème Semestre", periodType: "Semestre" },
        ];
      } else if (type === "Sequences6") {
        periodsToCreate = [
          { name: "1ère Séquence", periodType: "Séquence" },
          { name: "2ème Séquence", periodType: "Séquence" },
          { name: "3ème Séquence", periodType: "Séquence" },
          { name: "4ème Séquence", periodType: "Séquence" },
          { name: "5ème Séquence", periodType: "Séquence" },
          { name: "6ème Séquence", periodType: "Séquence" },
        ];
      } else if (type === "Sequences4") {
        periodsToCreate = [
          { name: "1ère Séquence", periodType: "Séquence" },
          { name: "2ème Séquence", periodType: "Séquence" },
          { name: "3ème Séquence", periodType: "Séquence" },
          { name: "4ème Séquence", periodType: "Séquence" },
        ];
      } else if (type === "Superior") {
        periodsToCreate = Array.from({ length: 14 }, (_, i) => {
          const num = i + 1;
          return {
            name: `${num === 1 ? "1er" : `${num}ème`} Semestre (S${num})`,
            periodType: "Semestre",
          };
        });
      }

      const activeSessionObj = sessionsList?.find((s: any) => s.isActive) || sessionsList?.[0];
      const sid = periodSessionId 
        ? Number(periodSessionId) 
        : (selectedPeriodSessionId && selectedPeriodSessionId !== "all" 
            ? Number(selectedPeriodSessionId) 
            : (activeSessionObj?.id || null));

      if (!sid) {
        toast.error("Veuillez d'abord sélectionner une année scolaire.");
        return;
      }

      // FIXED: Remove the pre-check against local `periodsList` state which can be stale
      // (e.g., loaded from another school or outdated). The server-side `createPeriod` now
      // handles deduplication correctly and returns `_alreadyExisted: true` for existing periods.
      let countCreated = 0;
      let countSkipped = 0;
      const errors: string[] = [];

      for (const p of periodsToCreate) {
        const res = await createPeriod({
          name: p.name,
          periodType: p.periodType,
          sessionId: sid,
          isActive: true,
        });
        if (res.success) {
          const createdObj = (res.data as any)?.data || res.data;
          const alreadyExisted = (createdObj as any)?._alreadyExisted === true;
          if (createdObj && createdObj.id && !alreadyExisted) {
            const sessionObj = sessionsList?.find((s: any) => s.id === sid);
            const fullObj = { 
              ...createdObj, 
              sessionId: createdObj.sessionId ?? createdObj.session_id ?? sid, 
              session_id: createdObj.session_id ?? createdObj.sessionId ?? sid, 
              session: sessionObj 
            };
            setPeriodsList((prev: any[]) => {
              const existsInPrev = prev.some((item: any) => item.id === fullObj.id);
              return existsInPrev ? prev : [...prev, fullObj];
            });
            countCreated++;
          } else {
            countSkipped++;
          }
        } else {
          // Collect the real error message for diagnostic feedback
          const errMsg = res.error || `Erreur inconnue pour "${p.name}"`;
          errors.push(errMsg);
          console.error(`[Génération rapide] Failed "${p.name}":`, errMsg);
        }
      }

      if (countCreated > 0) {
        toast.success(`${countCreated} nouvelle(s) période(s) générée(s) avec succès !${
          countSkipped > 0 ? ` (${countSkipped} déjà existante(s) ignorée(s))` : ""
        }`);
        router.refresh();
      } else if (countSkipped > 0) {
        toast.info("Toutes les périodes sélectionnées existent déjà pour cette année scolaire.");
      } else if (errors.length > 0) {
        // Show the first real error so the user knows what's wrong
        const uniqueErrors = [...new Set(errors)];
        toast.error(`Échec de la génération : ${uniqueErrors[0]}`, { duration: 8000 });
      } else {
        toast.warning("Aucune période n'a pu être créée.");
      }
    });
  };

  const handleCreateClass = () => {
    if (!className || !classSectionId) return;
    const targetSec = sectionsList.find((s: any) => s.id === Number(classSectionId));
    const tempId = Date.now();
    const tempClassObj = {
      id: tempId,
      className,
      sectionId: Number(classSectionId),
      roomName,
      scolariteMensuelle: scolarite ? Number(scolarite) : 0,
      droitsInscription: inscription ? Number(inscription) : 0,
      cogesCarteId: coges ? Number(coges) : 0,
      transportInternat: transport ? Number(transport) : 0,
      ancienSolde: ancienSolde ? Number(ancienSolde) : 0,
      statutInitial,
      section: targetSec,
    };
    setClassesList((prev: any[]) => [...prev, tempClassObj]);
    setClassName("");
    setRoomName("");
    setScolarite("");
    setInscription("");
    setCoges("");
    setTransport("");
    setAncienSolde("");
    setStatutInitial("");

    startTransition(async () => {
      const res = await createClass({ 
        className: tempClassObj.className, 
        sectionId: Number(classSectionId),
        roomName: tempClassObj.roomName,
        scolariteMensuelle: tempClassObj.scolariteMensuelle,
        droitsInscription: tempClassObj.droitsInscription,
        cogesCarteId: tempClassObj.cogesCarteId,
        transportInternat: tempClassObj.transportInternat,
        ancienSolde: tempClassObj.ancienSolde,
        statutInitial: tempClassObj.statutInitial
      });
      if (res.success) {
        toast.success(`Classe "${tempClassObj.className}" créée avec succès`);
        router.refresh();
      } else {
        setClassesList((prev: any[]) => prev.filter((c: any) => c.id !== tempId));
        toast.error(res.error || "Erreur lors de la création de la classe");
      }
    });
  };

  const startEditClass = (c: any) => {
    setEditingClassId(c.id);
    setEditClassName(c.className);
    setEditClassSectionId(c.sectionId?.toString() || "");
    setEditRoomName(c.roomName || "");
    setEditScolarite(c.scolariteMensuelle?.toString() || "");
    setEditInscription(c.droitsInscription?.toString() || "");
    setEditCoges(c.cogesCarteId?.toString() || "");
    setEditTransport(c.transportInternat?.toString() || "");
    setEditAncienSolde(c.ancienSolde?.toString() || "");
    setEditStatutInitial(c.statutInitial || "");
  };

  const handleUpdateClass = (id: number) => {
    if (!editClassName || !editClassSectionId) return;
    const targetSec = sectionsList.find((s: any) => s.id === Number(editClassSectionId));
    const oldClasses = [...classesList];
    setClassesList((prev: any[]) => prev.map((c: any) => c.id === id ? {
      ...c,
      className: editClassName,
      sectionId: Number(editClassSectionId),
      roomName: editRoomName,
      scolariteMensuelle: editScolarite ? Number(editScolarite) : 0,
      droitsInscription: editInscription ? Number(editInscription) : 0,
      cogesCarteId: editCoges ? Number(editCoges) : 0,
      transportInternat: editTransport ? Number(editTransport) : 0,
      ancienSolde: editAncienSolde ? Number(editAncienSolde) : 0,
      statutInitial: editStatutInitial,
      section: targetSec || c.section,
    } : c));
    setEditingClassId(null);

    startTransition(async () => {
      const res = await updateClass(id, {
        className: editClassName,
        sectionId: Number(editClassSectionId),
        roomName: editRoomName,
        scolariteMensuelle: editScolarite ? Number(editScolarite) : 0,
        droitsInscription: editInscription ? Number(editInscription) : 0,
        cogesCarteId: editCoges ? Number(editCoges) : 0,
        transportInternat: editTransport ? Number(editTransport) : 0,
        ancienSolde: editAncienSolde ? Number(editAncienSolde) : 0,
        statutInitial: editStatutInitial,
      });
      if (res.success) {
        toast.success(`Classe "${editClassName}" mise à jour avec succès`);
        router.refresh();
      } else {
        setClassesList(oldClasses);
        toast.error(res.error || "Erreur lors de la mise à jour de la classe");
      }
    });
  };

  const handleDeleteClass = (id: number, name: string) => {
    if (!confirm(`Supprimer la classe "${name}" ?`)) return;
    setClassesList((prev: any[]) => prev.filter((c: any) => c.id !== id));
    startTransition(async () => {
      const res = await deleteClass(id);
      if (res.success) {
        toast.success("Classe supprimée avec succès");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la suppression de la classe");
      }
    });
  };

  const handleCreateLevel = () => {
    if (!levelName) return;
    const tempName = levelName.trim();
    const tempId = Date.now();
    setEducationalLevelsList((prev: any[]) => [...prev, { id: tempId, levelName: tempName }]);
    setLevelName("");

    startTransition(async () => {
      const res = await createEducationalLevel(tempName);
      if (res.success) {
        toast.success(`Niveau "${tempName}" ajouté avec succès`);
        router.refresh();
      } else {
        setEducationalLevelsList((prev: any[]) => prev.filter((l: any) => l.id !== tempId));
        toast.error(res.error || "Erreur lors de l'ajout du niveau");
      }
    });
  };

  const handleCreateCanevasReference = (category: "type" | "cycle" | "commune", value: string, reset: () => void) => {
    if (!value.trim()) return;
    startTransition(async () => {
      const res = await createCanevasReferenceItem(category, value);
      if (res.success) {
        toast.success("Référence canevas ajoutée avec succès");
        reset();
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'ajout de la référence");
      }
    });
  };

  const handleCreateSection = () => {
    if (!sectionName) return;
    const tempName = sectionName.trim();
    const tempLevel = sectionLevel;
    const tempId = Date.now();
    setSectionsList((prev: any[]) => [...prev, {
      id: tempId,
      sectionName: tempName,
      educationalLevel: tempLevel,
      minPassingGrade: 10,
      redoublementThreshold: 8,
      exclusionThreshold: 5,
      numTerms: 3,
    }]);
    setSectionName("");

    startTransition(async () => {
      const res = await createSection({ sectionName: tempName, educationalLevel: tempLevel });
      if (res.success) {
        toast.success(`Section "${tempName}" créée avec succès`);
        router.refresh();
      } else {
        setSectionsList((prev: any[]) => prev.filter((s: any) => s.id !== tempId));
        toast.error(res.error || "Erreur lors de la création de la section");
      }
    });
  };

  const startEditSection = (s: any) => {
    setEditingSectionId(s.id);
    setEditSectionName(s.sectionName || "");
    setEditSectionLevel(s.educationalLevel || "");
    setEditMinPassingGrade((s.minPassingGrade ?? 10).toString());
    setEditRedoublementThreshold((s.redoublementThreshold ?? 8).toString());
    setEditExclusionThreshold((s.exclusionThreshold ?? 5).toString());
    setEditNumTerms(s.numTerms || 3);
    setEditTermLabels(s.termLabels || "");
  };

  const handleSaveSection = (id: number) => {
    if (!editSectionName.trim()) {
      toast.error("Le nom de la section est requis");
      return;
    }
    const passing = parseFloat(editMinPassingGrade) || 10;
    const redoubl = parseFloat(editRedoublementThreshold) || 8;
    const exclus = parseFloat(editExclusionThreshold) || 5;

    const oldSections = [...sectionsList];
    setSectionsList((prev: any[]) => prev.map((s: any) => s.id === id ? {
      ...s,
      sectionName: editSectionName.trim(),
      educationalLevel: editSectionLevel,
      minPassingGrade: passing,
      redoublementThreshold: redoubl,
      exclusionThreshold: exclus,
      numTerms: editNumTerms,
      termLabels: editTermLabels,
    } : s));
    setEditingSectionId(null);

    startTransition(async () => {
      const res = await updateSection(id, {
        sectionName: editSectionName.trim(),
        educationalLevel: editSectionLevel,
        minPassingGrade: passing,
        redoublementThreshold: redoubl,
        exclusionThreshold: exclus,
        numTerms: editNumTerms,
        termLabels: editTermLabels,
      });
      if (res.success) {
        toast.success(`Section "${editSectionName}" mise à jour avec succès`);
        router.refresh();
      } else {
        setSectionsList(oldSections);
        toast.error(res.error || "Erreur lors de la modification de la section");
      }
    });
  };

  const handleCreateSubject = () => {
    if (!subjectName) return;
    const tempName = subjectName.trim();
    const tempId = Date.now();
    setSubjectsList((prev: any[]) => [...prev, {
      id: tempId,
      subjectName: tempName,
      category: null,
      subjectCode: null,
    }]);
    setSubjectName("");
    setSubjectSectionId("");
    setSubjectNiveau("");
    setSubjectSearch("");

    startTransition(async () => {
      const res = await createSubject({ 
        subjectName: tempName, 
        sectionId: subjectSectionId ? Number(subjectSectionId) : undefined,
        educationalLevel: subjectNiveau || undefined,
      });
      if (res.success) {
        toast.success(`Matière "${tempName}" créée avec succès`);
        router.refresh();
      } else {
        setSubjectsList((prev: any[]) => prev.filter((s: any) => s.id !== tempId));
        toast.error(res.error || "Erreur lors de la création de la matière");
      }
    });
  };

  const handleDeleteSubject = (id: number, name: string) => {
    if (!confirm(`Supprimer la matière "${name}" ?`)) return;
    setSubjectsList((prev: any[]) => prev.filter((s: any) => s.id !== id));
    startTransition(async () => {
      const res = await deleteSubject(id);
      if (res.success) {
        toast.success("Matière supprimée avec succès");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la suppression");
      }
    });
  };

  const handleLinkSubject = (targetSecId?: string, targetSubId?: string, targetTerm?: string, targetCoef?: string, targetElim?: boolean) => {
    const secId = targetSecId || linkSectionId;
    const subId = targetSubId || linkSubjectId;
    const term = targetTerm || linkPeriod;
    const coef = targetCoef || linkCoef;
    const elim = targetElim !== undefined ? targetElim : linkEliminatory;

    if (!secId || !subId) {
      toast.error("Veuillez sélectionner une section et une matière");
      return;
    }

    const secObj = sectionsList.find((s: any) => s.id === Number(secId));
    const subObj = subjectsList.find((s: any) => s.id === Number(subId));
    const tempId = Date.now();
    const newItem = {
      id: tempId,
      sectionId: Number(secId),
      subjectId: Number(subId),
      term: term,
      defaultCoef: Number(coef),
      isEliminatory: elim,
      section: secObj || { sectionName: "Section" },
      subject: subObj || { subjectName: "Matière" }
    };

    setSectionSubjectsList((prev: any[]) => [newItem, ...prev]);
    setLinkSubjectId("");
    setShowSectionLinkBuilder(false);
    toast.success("Matière associée avec succès à la section");

    startTransition(async () => {
      const res = await linkSubjectToSection({
        sectionId: Number(secId),
        subjectId: Number(subId),
        term: term,
        defaultCoef: Number(coef),
        isEliminatory: elim
      });
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la liaison de la matière");
        setSectionSubjectsList((prev: any[]) => prev.filter((item: any) => item.id !== tempId));
      } else {
        router.refresh();
      }
    });
  };

  const handleAddPlanLink = (targetClassId?: string, targetSubjectId?: string, targetCoef?: string) => {
    const clsId = targetClassId || planClassId;
    const subId = targetSubjectId || planSubjectId;
    const coef = targetCoef || planCoef;

    if (!clsId || !subId) {
      toast.error("Veuillez sélectionner une classe et une matière");
      return;
    }

    const clsObj = classesList.find((c: any) => c.id === Number(clsId));
    const subObj = subjectsList.find((s: any) => s.id === Number(subId));
    const tempId = Date.now();
    const newItem = {
      id: tempId,
      classId: Number(clsId),
      subjectId: Number(subId),
      coefficient: Number(coef),
      class: clsObj || { className: "Classe" },
      subject: subObj || { subjectName: "Matière" }
    };

    setClassSubjectsList((prev: any[]) => [...prev, newItem]);
    setPlanSubjectId("");
    setPlanCoef("1");
    setSelectedClassForModal(null);
    toast.success("Matière ajoutée au plan d'études avec succès");

    startTransition(async () => {
      const res = await addClassSubjectLink({
        classId: Number(clsId),
        subjectId: Number(subId),
        coefficient: Number(coef)
      });
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la liaison de la matière");
        setClassSubjectsList((prev: any[]) => prev.filter((item: any) => item.id !== tempId));
      } else {
        router.refresh();
      }
    });
  };

  const handleUpdateSectionLink = () => {
    if (!editingSectionLink) return;
    const secObj = sectionsList.find((s: any) => s.id === Number(editLinkSectionId));
    const subObj = subjectsList.find((s: any) => s.id === Number(editLinkSubjectId));
    const targetId = editingSectionLink.id;
    const oldList = [...sectionSubjectsList];

    setSectionSubjectsList((prev: any[]) => prev.map((item: any) => item.id === targetId ? {
      ...item,
      sectionId: Number(editLinkSectionId),
      subjectId: Number(editLinkSubjectId),
      term: editLinkPeriod,
      defaultCoef: Number(editLinkCoef),
      isEliminatory: editLinkEliminatory,
      section: secObj || item.section,
      subject: subObj || item.subject,
    } : item));
    setEditingSectionLink(null);
    toast.success("Carte de section mise à jour avec succès");

    startTransition(async () => {
      const res = await updateSectionSubjectLink(targetId, {
        sectionId: Number(editLinkSectionId),
        subjectId: Number(editLinkSubjectId),
        term: editLinkPeriod,
        defaultCoef: Number(editLinkCoef),
        isEliminatory: editLinkEliminatory,
      });
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la modification");
        setSectionSubjectsList(oldList);
      } else {
        router.refresh();
      }
    });
  };

  const handleUpdateClassSubjectLink = () => {
    if (!editingClassSubject) return;
    const subObj = subjectsList.find((s: any) => s.id === Number(editClassSubjectId));
    const targetId = editingClassSubject.id;
    const oldList = [...classSubjectsList];

    setClassSubjectsList((prev: any[]) => prev.map((item: any) => item.id === targetId ? {
      ...item,
      subjectId: Number(editClassSubjectId),
      coefficient: Number(editClassCoef),
      subject: subObj || item.subject,
    } : item));
    setEditingClassSubject(null);
    toast.success("Matière de classe mise à jour avec succès");

    startTransition(async () => {
      const res = await updateClassSubjectLink(targetId, {
        coefficient: Number(editClassCoef),
        subjectId: Number(editClassSubjectId),
      });
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la modification");
        setClassSubjectsList(oldList);
      } else {
        router.refresh();
      }
    });
  };

  const handleDeleteSectionLink = (id: number) => {
    const oldList = [...sectionSubjectsList];
    setSectionSubjectsList((prev: any[]) => prev.filter((item: any) => item.id !== id));
    toast.success("Carte d'association supprimée");
    startTransition(async () => {
      const res = await deleteSectionSubjectLink(id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression");
        setSectionSubjectsList(oldList);
      } else {
        router.refresh();
      }
    });
  };

  const handleDeleteClassSubjectLink = (id: number) => {
    const oldList = [...classSubjectsList];
    setClassSubjectsList((prev: any[]) => prev.filter((item: any) => item.id !== id));
    toast.success("Matière retirée du plan d'études");
    startTransition(async () => {
      const res = await deleteClassSubjectLink(id);
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression");
        setClassSubjectsList(oldList);
      } else {
        router.refresh();
      }
    });
  };

  const handleClearSectionSubjects = () => {
    if (!confirm("Voulez-vous vraiment supprimer TOUS les liens Matières ↔ Sections ? Cette action est irréversible.")) return;
    setSectionSubjectsList([]);
    clearAcademicFilterCache();
    toast.success("Tous les liens Matières ↔ Sections ont été supprimés.");
    startTransition(async () => {
      const res = await clearAllSectionSubjectLinks();
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression des liens de section");
      } else {
        router.refresh();
      }
    });
  };

  const handleClearClassSubjects = () => {
    if (!confirm("Voulez-vous vraiment supprimer TOUT le Plan d'Études (Lien Classe-Matière) ? Cette action est irréversible.")) return;
    setClassSubjectsList([]);
    clearAcademicFilterCache();
    toast.success("Tout le Plan d'Études a été supprimé.");
    startTransition(async () => {
      const res = await clearAllClassSubjectLinks();
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression du plan d'études");
      } else {
        router.refresh();
      }
    });
  };

  const handleClearAllSubjectLinks = () => {
    if (!confirm("Voulez-vous vraiment supprimer TOUS les liens (Lien Matières ↔ Sections et Plan d'Études) ? Cette action est irréversible.")) return;
    setSectionSubjectsList([]);
    setClassSubjectsList([]);
    clearAcademicFilterCache();
    toast.success("Tous les liens de matières ont été effacés avec succès.");
    startTransition(async () => {
      const res = await clearAllAcademicSubjectLinks();
      if (!res.success) {
        toast.error(res.error || "Erreur lors de la suppression globale");
      } else {
        router.refresh();
      }
    });
  };

  const handleCreateGrading = () => {
    if (!gradingName) return;
    const tempName = gradingName.trim();
    const tempScore = Number(gradingScore) || 10;
    const tempId = Date.now();
    setGradingList((prev: any[]) => [...prev, { id: tempId, name: tempName, baseScore: tempScore }]);
    setGradingName("");

    startTransition(async () => {
      const res = await createGradingAppreciation(tempName, tempScore);
      if (res.success) {
        toast.success("Appréciation ajoutée avec succès");
        router.refresh();
      } else {
        setGradingList((prev: any[]) => prev.filter((g: any) => g.id !== tempId));
        toast.error(res.error || "Erreur lors de l'ajout de l'appréciation");
      }
    });
  };

  const handleCreateRemark = () => {
    if (!remarkContent) return;
    const tempContent = remarkContent.trim();
    const tempCat = remarkCategory;
    const tempSecId = remarkSectionId ? Number(remarkSectionId) : null;
    const targetSec = sectionsList.find((s: any) => s.id === tempSecId);
    const tempId = Date.now();
    setRemarksList((prev: any[]) => [...prev, {
      id: tempId,
      category: tempCat,
      content: tempContent,
      sectionId: tempSecId,
      section: targetSec,
    }]);
    setRemarkContent("");

    startTransition(async () => {
      const res = await createSchoolRemark({
        category: tempCat,
        content: tempContent,
        sectionId: tempSecId || undefined
      });
      if (res.success) {
        toast.success("Mention ajoutée avec succès");
        router.refresh();
      } else {
        setRemarksList((prev: any[]) => prev.filter((r: any) => r.id !== tempId));
        toast.error(res.error || "Erreur lors de l'ajout de la remarque");
      }
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Sessions */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="text-blue-500" />
          <h2 className="text-xl font-bold text-white">Années Scolaires (Sessions)</h2>
        </div>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Ex: 2025-2026"
            value={sessionName}
            disabled={!canEdit}
            onChange={(e) => setSessionName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <Button onClick={handleCreateSession} disabled={isPending || !sessionName || !canEdit} className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 disabled:opacity-50">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {sessionsList?.map((s: any) => {
            const isFrozen = s.status === "Clôturé" || s.status === "Gelé" || s.status === "Verrouillé" || s.status === "Archivé";
            const isActive = Boolean(s.isActive);

            return (
              <div key={s.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isActive && !isFrozen ? 'bg-emerald-500/5 border-emerald-500/30' : isFrozen ? 'bg-rose-500/5 border-rose-500/30' : 'bg-[#181924] border-slate-800/50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 font-bold text-base">{s.sessionName}</span>
                  
                  {/* Status Badges */}
                  {isActive && !isFrozen ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      🟢 Année Actuelle (En Cours)
                    </span>
                  ) : isActive && isFrozen ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      <Lock size={12} /> Année Actuelle (Gelée - تجميد)
                    </span>
                  ) : isFrozen ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                      <Lock size={12} /> Année Gelée / Clôturée (تجميد - قراءة فقط)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-800/60 border border-slate-700/50 px-2.5 py-0.5 rounded-full">
                      ⚪ Année Inactive
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Freeze / Unfreeze Toggle Button ("تجميد / فك تجميد العام الدراسي") */}
                  <Button
                    onClick={() => {
                      const newFrozen = !isFrozen;
                      startTransition(async () => {
                        const res = await toggleSessionLock(s.id, newFrozen);
                        if (res.success) {
                          setSessionsList((prev: any[]) =>
                            prev.map((item) => {
                              if (item.id === s.id) {
                                return {
                                  ...item,
                                  status: newFrozen ? "Clôturé" : "Actif",
                                  isActive: newFrozen ? false : true,
                                };
                              }
                              if (!newFrozen) {
                                return { ...item, isActive: false };
                              }
                              return item;
                            })
                          );
                          toast.success(
                            newFrozen
                              ? `تم تجميد العام الدراسي "${s.sessionName}" بنجاح 🔒`
                              : `تم فك تجميد العام الدراسي "${s.sessionName}" وتفعيله بنجاح 🔓`
                          );
                          router.refresh();
                        } else {
                          toast.error(res.error || "Erreur lors du changement d'état de verrouillage");
                        }
                      });
                    }}
                    disabled={isPending || !canEdit}
                    className={`h-8 text-xs rounded-lg px-3 font-semibold border flex items-center gap-1.5 transition ${
                      isFrozen
                        ? "bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border-amber-500/40"
                        : "bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border-rose-500/40"
                    }`}
                  >
                    {isFrozen ? (
                      <>
                        <Unlock size={12} /> فك التجميد (Dégeler)
                      </>
                    ) : (
                      <>
                        <Lock size={12} /> تجميد العام (Geler)
                      </>
                    )}
                  </Button>

                  {/* Set Active Session Button */}
                  {!isActive && (
                    <Button 
                      onClick={() => {
                        startTransition(async () => {
                          const res = await setActiveSession(s.id);
                          if (res.success) {
                            setSessionsList((prev: any[]) =>
                              prev.map((item) => ({
                                ...item,
                                isActive: item.id === s.id,
                                status: item.id === s.id ? "Actif" : "Inactif",
                              }))
                            );
                            toast.success(`Année scolaire "${s.sessionName}" activée comme année actuelle ! 🟢`);
                            router.refresh();
                          } else {
                            toast.error(res.error || "Erreur d'activation de la session");
                          }
                        });
                      }}
                      disabled={isPending || !canEdit}
                      className="h-8 text-xs bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg px-3 font-semibold flex items-center gap-1.5"
                    >
                      🟢 Définir comme Année Actuelle
                    </Button>
                  )}

                  {/* Delete Button */}
                  <button 
                    onClick={() => {
                      if (confirm(`Supprimer l'année scolaire "${s.sessionName}" ?`)) {
                        startTransition(async () => {
                          const res = await deleteSession(s.id);
                          if (res.success) {
                            setSessionsList((prev: any[]) => prev.filter((item) => item.id !== s.id));
                            toast.success("Année scolaire supprimée avec succès");
                            router.refresh();
                          } else {
                            toast.error(res.error || "Erreur lors de la suppression");
                          }
                        });
                      }
                    }}
                    disabled={isPending || !canEdit}
                    className="p-1.5 text-rose-500/70 hover:text-rose-500 border border-slate-800 hover:border-rose-500/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Supprimer l'année scolaire"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1.4 Mass Promotion Wizard */}
      <div className="bg-[#1F222B] border border-indigo-500/30 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800/80">
          <Award className="text-indigo-400" size={24} />
          <div>
            <h2 className="text-lg font-bold text-white">🚀 Assistant de Promotion & Passage de Classe en Masse</h2>
            <p className="text-xs text-slate-400">Exécutez le transfert annuel des élèves admis vers leur classe supérieure et réassignez les redoublants en 1 clic.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">1. Classe Source (Année المنتهية)</label>
            <select 
              value={promoSourceClassId}
              onChange={(e) => setPromoSourceClassId(e.target.value)}
              className="w-full bg-[#181924] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Sélectionner la classe source...</option>
              {classesList?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">2. Classe Cible de Promotion (Année الجديد)</label>
            <select 
              value={promoTargetClassId}
              onChange={(e) => setPromoTargetClassId(e.target.value)}
              className="w-full bg-[#181924] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Sélectionner la classe cible...</option>
              {classesList?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">3. Année Scolaire Cible</label>
            <select 
              value={promoTargetSessionId}
              onChange={(e) => setPromoTargetSessionId(e.target.value)}
              className="w-full bg-[#181924] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Sélectionner l'année scolaire cible...</option>
              {sessionsList?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.sessionName} {s.isActive ? "(🟢 Active)" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (!promoSourceClassId || !promoTargetClassId || !promoTargetSessionId) {
                toast.error("Veuillez sélectionner la classe source, la classe cible et l'année scolaire.");
                return;
              }
              if (confirm("Êtes-vous sûr d'exécuter la promotion en masse des élèves pour ces classes ?")) {
                startTransition(async () => {
                  const res = await promoteClassStudents({
                    sourceClassId: Number(promoSourceClassId),
                    targetClassId: Number(promoTargetClassId),
                    newSessionId: Number(promoTargetSessionId),
                  });
                  if (res.success) {
                    toast.success((res as any).message || "Promotion exécutée avec succès !");
                    setPromoSourceClassId("");
                    setPromoTargetClassId("");
                    router.refresh();
                  } else {
                    toast.error(res.error || "Erreur lors de la promotion des élèves");
                  }
                });
              }
            }}
            disabled={isPending || !canEdit || !promoSourceClassId || !promoTargetClassId || !promoTargetSessionId}
            className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-5 flex items-center gap-2 shadow-md"
          >
            🚀 Exécuter la Promotion en Masse (1-Click)
          </Button>
        </div>
      </div>

      {/* Extension Requests Panel (Demandes de Dérogation) */}
      {extensionRequests && extensionRequests.length > 0 && (
        <div className="bg-[#1F222B] border border-amber-500/40 rounded-3xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800/80">
            <Bell className="text-amber-400 animate-pulse" size={22} />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                ⚡ Demandes de Dérogation & Déblocage 
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {extensionRequests.filter(r => r.status === "En attente").length} en attente
                </span>
              </h2>
              <p className="text-xs text-slate-400">Demandes de réouverture de la saisie des notes soumises par les enseignants depuis l'application mobile.</p>
            </div>
          </div>

          <div className="space-y-3">
            {extensionRequests.map((req: any) => (
              <div key={req.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${req.status === 'En attente' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-[#181924] border-slate-800/60'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">{req.teacherName || "Enseignant"}</span>
                    <span className="text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-md font-semibold">
                      {req.periodName}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      req.status === "Approuvé" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      req.status === "Rejeté" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {req.status === "En attente" ? "⏳ En attente d'approbation" : req.status === "Approuvé" ? "✅ Approuvé & Débloqué" : "❌ Rejeté"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic">💬 Motif : "{req.reason}"</p>
                </div>

                {req.status === "En attente" && (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => {
                        startTransition(async () => {
                          const res = await handlePeriodExtensionRequest(req.id, "Approuver");
                          if (res.success) {
                            toast.success("Demande approuvée avec succès ! La période a été déverrouillée.");
                            setExtensionRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "Approuvé" } : r));
                            router.refresh();
                          } else {
                            toast.error(res.error || "Erreur de traitement de la demande");
                          }
                        });
                      }}
                      disabled={isPending || !canEdit}
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 shadow-sm"
                    >
                      ✅ Approuver & Débloquer
                    </Button>
                    <Button 
                      onClick={() => {
                        startTransition(async () => {
                          const res = await handlePeriodExtensionRequest(req.id, "Refuser");
                          if (res.success) {
                            toast.info("Demande de dérogation refusée.");
                            setExtensionRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: "Rejeté" } : r));
                            router.refresh();
                          } else {
                            toast.error(res.error || "Erreur de traitement de la demande");
                          }
                        });
                      }}
                      disabled={isPending || !canEdit}
                      variant="ghost"
                      className="h-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-bold px-3 border border-rose-500/20"
                    >
                      ❌ Refuser
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1.5 Périodes & Séquences */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-teal-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Périodes & Séquences (Trimestres / Semestres / Séquences)</h2>
              <p className="text-xs text-slate-400">Gérez les découpages académiques par année scolaire.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-[#181924] p-2 rounded-2xl border border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 pl-2">Année scolaire :</span>
            <select 
              value={selectedPeriodSessionId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedPeriodSessionId(val);
                if (val && val !== "all") {
                  setPeriodSessionId(val);
                }
              }}
              className="bg-[#1F222B] text-teal-400 font-bold border border-teal-500/30 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="all">-- Toutes les années --</option>
              {sessionsList.map((s: any) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.sessionName} {s.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DIAGNOSTIC PANEL FOR USER & DEBUGGING */}
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-mono space-y-1">
          <p>🔍 [DIAGNOSTIC MODE] initialPeriods: {initialPeriods?.length ?? 0} | periodsList: {periodsList?.length ?? 0}</p>
          <p>🔍 Filter Selected: "{selectedPeriodSessionId}" | sessionsList: {sessionsList?.map((s: any) => `${s.id}:${s.sessionName}`).join(", ")}</p>
          {periodsList && periodsList.length > 0 && (
            <p>🔍 Sample Period 0: ID={periodsList[0]?.id}, Name={periodsList[0]?.name}, SessionId={periodsList[0]?.sessionId ?? periodsList[0]?.session_id}, SchoolId={periodsList[0]?.schoolId ?? periodsList[0]?.school_id}</p>
          )}
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <span className="text-xs font-bold text-slate-400">Génération rapide :</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("Primaire")}
              className="text-xs bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ 3 Trimestres
            </button>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("CollegeLycee")}
              className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ 2 Semestres
            </button>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("Sequences6")}
              className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ 6 Séquences (S1-S6)
            </button>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("Sequences4")}
              className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ 4 Séquences (S1-S4)
            </button>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("Superior")}
              className="text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ Supérieur (S1 - S14)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom (ex: 1er Trimestre ou 1ère Séquence)"
            value={periodName}
            disabled={!canEdit}
            onChange={(e) => setPeriodName(e.target.value)}
            className="md:col-span-2 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-teal-500 disabled:opacity-50 font-medium"
          />
          <select 
            value={periodType}
            disabled={!canEdit}
            onChange={(e) => setPeriodType(e.target.value)}
            className="bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none disabled:opacity-50 font-bold"
          >
            <option value="Trimestre">Trimestre</option>
            <option value="Semestre">Semestre</option>
            <option value="Séquence">Séquence</option>
            <option value="Autre">Autre / Mois</option>
          </select>
          <select 
            value={periodSessionId}
            disabled={!canEdit}
            onChange={(e) => setPeriodSessionId(e.target.value)}
            className="bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none disabled:opacity-50 font-medium"
          >
            <option value="">-- Année Sélectionnée --</option>
            {sessionsList.map((s: any) => (
              <option key={s.id} value={s.id}>{s.sessionName}</option>
            ))}
          </select>

          <div className="md:col-span-4 flex flex-wrap md:flex-nowrap items-end gap-4 bg-[#14151F] p-4 rounded-xl border border-slate-800/80">
            <div className="flex-1 space-y-1">
              <label className="text-[11px] uppercase font-bold text-teal-400 flex items-center gap-1.5">
                <CalendarDays size={12} /> Date de Début (Ouverture)
              </label>
              <input 
                type="date" 
                value={periodStartDate}
                disabled={!canEdit}
                max={periodEndDate || undefined}
                onChange={(e) => setPeriodStartDate(e.target.value)}
                className={`w-full bg-[#181924] border text-white rounded-xl px-4 h-11 focus:outline-none focus:border-teal-500 text-xs font-medium ${
                  periodStartDate ? "border-teal-500/50" : "border-slate-700"
                }`}
              />
              {periodStartDate && (
                <p className="text-[10px] text-teal-400 font-semibold mt-0.5">
                  📅 Ouverture : {new Date(periodStartDate + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[11px] uppercase font-bold text-rose-400 flex items-center gap-1.5">
                <Lock size={12} /> Date de Fin (Clôture automatique)
              </label>
              <input 
                type="date" 
                value={periodEndDate}
                disabled={!canEdit}
                min={periodStartDate || undefined}
                onChange={(e) => {
                  if (periodStartDate && e.target.value && e.target.value <= periodStartDate) {
                    toast.error("⚠️ La Date de Fin doit être postérieure à la Date de Début.");
                    return;
                  }
                  setPeriodEndDate(e.target.value);
                }}
                className={`w-full bg-[#181924] border text-white rounded-xl px-4 h-11 focus:outline-none focus:border-rose-500 text-xs font-medium ${
                  periodEndDate && periodStartDate && periodEndDate <= periodStartDate
                    ? "border-red-500"
                    : periodEndDate ? "border-rose-500/50" : "border-slate-700"
                }`}
              />
              {periodEndDate && (
                <p className="text-[10px] text-rose-400 font-semibold mt-0.5">
                  🔒 Clôture : {new Date(periodEndDate + "T23:59:59").toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
              {!periodEndDate && (
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Optionnel — sans date de fin, la période reste ouverte indéfiniment.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreatePeriod} disabled={isPending || !periodName || !canEdit} className="h-11 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 disabled:opacity-50 font-bold">
                {editingPeriodId ? "Modifier la période" : "+ Ajouter la période"}
              </Button>
              {editingPeriodId && (
                 <Button variant="ghost" onClick={() => { setEditingPeriodId(null); setPeriodName(""); setPeriodStartDate(""); setPeriodEndDate(""); }} className="h-11 text-slate-400">Annuler</Button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {periodsList?.filter((p: any) => {
            if (!selectedPeriodSessionId || selectedPeriodSessionId === "all") return true;
            const pSid = (p.sessionId ?? p.session_id ?? p.session?.id)?.toString();
            if (!pSid) return true;
            return pSid === selectedPeriodSessionId;
          }).map((p: any) => {
            const isLocked = Boolean(p.isLocked || p.is_locked);
            const now = new Date();
            // Parse dates — compare at start-of-day for startDate and end-of-day for endDate
            // so the last day of the period is still open for grade entry.
            const rawStart = p.startDate || p.start_date;
            const rawEnd = p.endDate || p.end_date;
            const startDate = rawStart ? new Date(rawStart) : null;
            const endDate = rawEnd ? (() => {
              const d = new Date(rawEnd);
              d.setHours(23, 59, 59, 999); // end-of-day: last day is still open
              return d;
            })() : null;

            const isNotStarted = startDate ? now < startDate : false;
            const isEnded = endDate ? now > endDate : false;
            const isFrozen = isLocked || isEnded;

            return (
              <div key={p.id} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isFrozen ? 'bg-rose-500/5 border-rose-500/30' : isNotStarted ? 'bg-amber-500/5 border-amber-500/30' : editingPeriodId === p.id ? 'bg-teal-500/10 border-teal-500/50' : 'bg-[#181924] border-slate-800/50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 font-bold text-sm">{p.name}</span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-md">{p.periodType || p.period_type}</span>
                  {(p.session || p.sessionId || p.session_id) && (
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest bg-slate-800/70 px-2 py-0.5 rounded-md">
                      {p.session?.sessionName || sessionsList.find((s: any) => s.id === (p.sessionId ?? p.session_id))?.sessionName || `Session #${p.sessionId ?? p.session_id}`}
                    </span>
                  )}
                  {isLocked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                      <Lock size={11} /> Verrouillée (Gélée)
                    </span>
                  ) : isEnded ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                      <Lock size={11} /> Clôturée (Fin dépassée)
                    </span>
                  ) : isNotStarted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      ⏳ À venir (Fermée)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <Unlock size={11} /> Saisie Ouverte
                    </span>
                  )}
                </div>

                {/* Display Opening & Closing Dates inside the row */}
                <div className="hidden md:flex items-center gap-3 text-xs border-l border-slate-800/80 pl-4 my-0.5">
                  <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-700/50">
                    <CalendarDays size={13} className="text-teal-400" />
                    <span className="text-slate-400 text-[11px] font-semibold">Début:</span>
                    <span className="font-mono text-teal-300 font-bold">{startDate ? startDate.toLocaleDateString('fr-FR') : "--/--/----"}</span>
                  </span>
                  <span className="text-slate-600 font-bold">➔</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium bg-slate-800/40 px-2.5 py-1 rounded-lg border border-slate-700/50">
                    <Lock size={12} className="text-rose-400" />
                    <span className="text-slate-400 text-[11px] font-semibold">Fin:</span>
                    <span className="font-mono text-rose-300 font-bold">{endDate ? endDate.toLocaleDateString('fr-FR') : "--/--/----"}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      const newLocked = !isLocked;
                      startTransition(async () => {
                        const res = await togglePeriodLock(p.id, newLocked);
                        if (res.success) {
                          setPeriodsList((prev: any[]) =>
                            prev.map((item: any) =>
                              item.id === p.id ? { ...item, isLocked: newLocked, is_locked: newLocked } : item
                            )
                          );
                          toast.success(newLocked ? "🔒 Période verrouillée (Saisie congelée)" : "🔓 Période déverrouillée (Saisie ouverte)");
                        } else {
                          toast.error(res.error || "Erreur de modification du verrouillage");
                        }
                      });
                    }}
                    disabled={isPending || !canEdit}
                    title={isLocked ? "Déverrouiller la période (Ouvrir la saisie)" : "Verrouiller la période (Geler la saisie des notes)"}
                    className={`p-1.5 rounded-lg border transition-all ${
                      isLocked 
                        ? "text-rose-400 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20" 
                        : "text-slate-400 border-slate-700 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10"
                    }`}
                  >
                    {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                  <button 
                    onClick={() => startEditPeriod(p)}
                    disabled={isPending || !canEdit}
                    className="p-1.5 text-slate-400 hover:text-teal-400 border border-slate-800 hover:border-teal-500/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`Supprimer la période "${p.name}" ?`)) {
                        startTransition(async () => {
                          const res = await deletePeriod(p.id);
                          if (res.success) {
                            setPeriodsList((prev: any[]) => prev.filter((item: any) => item.id !== p.id));
                            toast.success("Période supprimée avec succès");
                          } else {
                            toast.error(res.error || "Erreur lors de la suppression");
                          }
                        });
                      }
                    }}
                    disabled={isPending || !canEdit}
                    className="p-1.5 text-rose-500/70 hover:text-rose-500 border border-slate-800 hover:border-rose-500/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {(!periodsList || periodsList.filter((p: any) => {
            if (!selectedPeriodSessionId || selectedPeriodSessionId === "all") return true;
            const pSid = (p.sessionId ?? p.session_id ?? p.session?.id)?.toString();
            if (!pSid) return true;
            return pSid === selectedPeriodSessionId;
          }).length === 0) && (
            <div className="text-center p-6 text-slate-400 bg-[#181924]/50 rounded-2xl border border-dashed border-slate-800 text-sm space-y-2">
              <p>Aucune période définie pour cette année scolaire. Utilisez <strong className="text-teal-400 font-semibold">Génération rapide</strong> ou <strong className="text-teal-400 font-semibold">+ Ajouter</strong> ci-dessus.</p>
              {periodsList && periodsList.length > 0 && (
                <p className="text-xs text-amber-400/90 font-medium">
                  ℹ️ {periodsList.length} période(s) au total existent dans le système (sélectionnez "-- Toutes les années --" pour les voir toutes).
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 1.7 Niveaux */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="text-purple-500" />
          <h2 className="text-xl font-bold text-white">Niveaux d'Étude</h2>
        </div>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom (ex: Lycée, Supérieur)"
            value={levelName}
            disabled={!canEdit}
            onChange={(e) => setLevelName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <Button onClick={handleCreateLevel} disabled={isPending || !levelName || !canEdit} className="h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 disabled:opacity-50">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {educationalLevelsList?.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <span className="text-slate-300 font-medium">{l.levelName}</span>
              <button 
                onClick={() => {
                  if (confirm(`Supprimer le niveau "${l.levelName}" ?`)) {
                    setEducationalLevelsList((prev: any[]) => prev.filter((item: any) => item.id !== l.id));
                    startTransition(async () => {
                      const res = await deleteEducationalLevel(l.id);
                      if (res.success) {
                        toast.success("Niveau supprimé avec succès");
                        router.refresh();
                      } else {
                        toast.error(res.error || "Erreur lors de la suppression");
                      }
                    });
                  }
                }}
                disabled={isPending || !canEdit}
                className="text-rose-500/70 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!educationalLevelsList || educationalLevelsList.length === 0) && (
            <div className="text-center p-4 text-slate-500 text-sm">Aucun niveau défini.</div>
          )}
        </div>
      </div>

      {/* 2. Sections / Filières */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="text-amber-500" />
          <h2 className="text-xl font-bold text-white">Sections / Filières</h2>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom de la section (ex: Littéraire)"
            value={sectionName}
            disabled={!canEdit}
            onChange={(e) => setSectionName(e.target.value)}
            className="flex-[2] bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <select 
            value={sectionLevel}
            disabled={!canEdit}
            onChange={(e) => setSectionLevel(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none disabled:opacity-50"
          >
            <option value="">Sélectionner un niveau</option>
            {educationalLevelsList?.map((l: any) => (
              <option key={l.id} value={l.levelName}>{l.levelName}</option>
            ))}
          </select>
          <Button onClick={handleCreateSection} disabled={isPending || !sectionName || !canEdit} className="h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 disabled:opacity-50">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-4">
          {sectionsList.map((s: any) => {
            const isEditing = editingSectionId === s.id;

            if (isEditing) {
              return (
                <div key={s.id} className="p-6 rounded-3xl bg-[#181924] border-2 border-amber-500/50 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-2">
                      <Pencil size={16} /> Modifier la Section : <span className="text-white underline">{s.sectionName}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => handleSaveSection(s.id)}
                        disabled={isPending || !editSectionName.trim()}
                        className="h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 text-xs font-bold shadow-md shadow-amber-900/30 flex items-center gap-1.5"
                      >
                        {isPending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                        <span>Enregistrer</span>
                      </Button>
                      <button 
                        onClick={() => setEditingSectionId(null)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-3 py-2 font-semibold transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nom de la Section</label>
                      <input 
                        type="text" 
                        value={editSectionName}
                        onChange={(e) => setEditSectionName(e.target.value)}
                        placeholder="Ex: Scientifique (Série D)"
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Niveau d'Étude</label>
                      <select 
                        value={editSectionLevel}
                        onChange={(e) => setEditSectionLevel(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="">Sélectionner un niveau</option>
                        {educationalLevelsList?.map((l: any) => (
                          <option key={l.id} value={l.levelName}>{l.levelName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-800/50">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Passage (Min)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={editMinPassingGrade}
                        onChange={(e) => setEditMinPassingGrade(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Redoubl. (Seuil)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={editRedoublementThreshold}
                        onChange={(e) => setEditRedoublementThreshold(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Exclusion (Seuil)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={editExclusionThreshold}
                        onChange={(e) => setEditExclusionThreshold(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Périodes</label>
                      <select 
                        value={editNumTerms}
                        onChange={(e) => setEditNumTerms(parseInt(e.target.value))}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none font-bold"
                      >
                        <option value={2}>2 (Semestres)</option>
                        <option value={3}>3 (Trimestres)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Libellés (comma separated)</label>
                      <input 
                        type="text" 
                        value={editTermLabels}
                        onChange={(e) => setEditTermLabels(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold text-xs"
                        placeholder="T1, T2, T3"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={s.id} className="p-6 rounded-3xl bg-[#181924] border border-slate-800/50 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-white">{s.sectionName}</span>
                    <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">{s.educationalLevel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => startEditSection(s)}
                      disabled={isPending || !canEdit}
                      title="Modifier la section"
                      className="text-slate-400 hover:text-amber-400 transition-colors p-2 hover:bg-amber-500/10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Supprimer la section "${s.sectionName}" ?`)) {
                          setSectionsList((prev: any[]) => prev.filter((item: any) => item.id !== s.id));
                          startTransition(async () => {
                            const res = await deleteSection(s.id);
                            if (res.success) {
                              toast.success("Section supprimée avec succès");
                              router.refresh();
                            } else {
                              toast.error(res.error || "Erreur lors de la suppression");
                            }
                          });
                        }
                      }}
                      disabled={isPending || !canEdit}
                      title="Supprimer la section"
                      className="text-rose-500/70 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-4 border-t border-slate-800/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Passage</label>
                    <input 
                      type="number" 
                      step="0.1"
                      defaultValue={s.minPassingGrade}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setSectionsList((prev: any[]) => prev.map((item: any) => item.id === s.id ? { ...item, minPassingGrade: val } : item));
                          startTransition(() => { updateSection(s.id, { minPassingGrade: val }); });
                        }
                      }}
                      className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Redoubl.</label>
                    <input 
                      type="number" 
                      step="0.1"
                      defaultValue={s.redoublementThreshold}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setSectionsList((prev: any[]) => prev.map((item: any) => item.id === s.id ? { ...item, redoublementThreshold: val } : item));
                          startTransition(() => { updateSection(s.id, { redoublementThreshold: val }); });
                        }
                      }}
                      className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Exclusion</label>
                    <input 
                      type="number" 
                      step="0.1"
                      defaultValue={s.exclusionThreshold}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setSectionsList((prev: any[]) => prev.map((item: any) => item.id === s.id ? { ...item, exclusionThreshold: val } : item));
                          startTransition(() => { updateSection(s.id, { exclusionThreshold: val }); });
                        }
                      }}
                      className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Périodes</label>
                    <select 
                      defaultValue={s.numTerms}
                      onChange={(e) => {
                        const n = parseInt(e.target.value);
                        setSectionsList((prev: any[]) => prev.map((item: any) => item.id === s.id ? { ...item, numTerms: n } : item));
                        startTransition(() => { updateSection(s.id, { numTerms: n }); });
                      }}
                      className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none font-bold"
                    >
                      <option value={2}>2 (Semestres)</option>
                      <option value={3}>3 (Trimestres)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Libellés (comma separated)</label>
                    <input 
                      type="text" 
                      defaultValue={s.termLabels}
                      onBlur={(e) => {
                        const txt = e.target.value;
                        setSectionsList((prev: any[]) => prev.map((item: any) => item.id === s.id ? { ...item, termLabels: txt } : item));
                        startTransition(() => { updateSection(s.id, { termLabels: txt }); });
                      }}
                      className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold text-xs"
                      placeholder="T1, T2, T3"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Classes / Niveaux */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="text-emerald-500" />
          <h2 className="text-xl font-bold text-white">Classes / Niveaux</h2>
        </div>
        
        {/* New Class Form */}
        <div className="space-y-4 mb-8 bg-[#181924] border border-slate-800/80 p-5 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">NOM DE LA CLASSE</label>
              <input 
                type="text" 
                placeholder="Ex: 6ème A"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">SECTION</label>
              <select 
                value={classSectionId}
                onChange={(e) => setClassSectionId(e.target.value)}
                className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-12 focus:outline-none"
              >
                <option value="">Sélectionner une Section</option>
                {sectionsList.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.sectionName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">SALLE</label>
              <input 
                type="text" 
                placeholder="Ex: Salle 10"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800/60 my-4 pt-4">
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4">PLANIFICATION DES FRAIS (FCFA)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">SCOLARITÉ MENSUELLE</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={scolarite}
                  onChange={(e) => setScolarite(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">DROITS D'INSCRIPTION</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={inscription}
                  onChange={(e) => setInscription(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">COGES & CARTE ID</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={coges}
                  onChange={(e) => setCoges(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">TRANSPORT & INTERNAT</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">ANCIEN SOLDE</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={ancienSolde}
                  onChange={(e) => setAncienSolde(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">STATUT INITIAL</label>
                <input 
                  type="text" 
                  placeholder="Ex: Actif"
                  value={statutInitial}
                  onChange={(e) => setStatutInitial(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleCreateClass} disabled={isPending || !className || !classSectionId} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-bold">
              + Ajouter la classe
            </Button>
          </div>
        </div>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classesList.map((c: any) => {
            const isEditing = editingClassId === c.id;
            
            if (isEditing) {
              return (
                <div key={c.id} className="flex flex-col p-5 rounded-2xl bg-[#181924] border border-emerald-500/50 gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold text-sm">Modifier la classe</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateClass(c.id)}
                        disabled={isPending}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 font-semibold transition-all disabled:opacity-50"
                      >
                        Enregistrer
                      </button>
                      <button 
                        onClick={() => setEditingClassId(null)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-3 py-1 font-semibold transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Nom de la classe</label>
                      <input 
                        type="text" 
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Salle</label>
                      <input 
                        type="text" 
                        value={editRoomName}
                        onChange={(e) => setEditRoomName(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Section</label>
                      <select 
                        value={editClassSectionId}
                        onChange={(e) => setEditClassSectionId(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="">Sélectionner une Section</option>
                        {sectionsList.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.sectionName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Scolarité</label>
                      <input 
                        type="number" 
                        value={editScolarite}
                        onChange={(e) => setEditScolarite(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Inscription</label>
                      <input 
                        type="number" 
                        value={editInscription}
                        onChange={(e) => setEditInscription(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Coges & ID</label>
                      <input 
                        type="number" 
                        value={editCoges}
                        onChange={(e) => setEditCoges(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Transport</label>
                      <input 
                        type="number" 
                        value={editTransport}
                        onChange={(e) => setEditTransport(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Ancien Solde</label>
                      <input 
                        type="number" 
                        value={editAncienSolde}
                        onChange={(e) => setEditAncienSolde(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Statut Initial</label>
                      <input 
                        type="text" 
                        value={editStatutInitial}
                        onChange={(e) => setEditStatutInitial(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={c.id} className="flex flex-col p-4 rounded-2xl bg-[#181924] border border-slate-800/80 gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-black text-base">{c.className}</span>
                    {c.section && <span className="text-[10px] bg-slate-800/60 text-slate-400 px-2 py-1 rounded-md uppercase font-bold tracking-wider">{c.section.sectionName}</span>}
                    {c.roomName && <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-1 rounded-md uppercase font-bold tracking-wider">Salle: {c.roomName}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => startEditClass(c)}
                      className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClass(c.id, c.className)}
                      disabled={isPending}
                      className="text-rose-500/70 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-3 gap-x-2 pt-3 border-t border-slate-800/50 text-[10px] text-slate-400">
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Scolarité</span>
                    <span className="font-mono text-slate-200 font-bold">{c.scolariteMensuelle || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Inscription</span>
                    <span className="font-mono text-slate-200 font-bold">{c.droitsInscription || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Coges & ID</span>
                    <span className="font-mono text-slate-200 font-bold">{c.cogesCarteId || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Transport</span>
                    <span className="font-mono text-slate-200 font-bold">{c.transportInternat || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Ancien Solde</span>
                    <span className="font-mono text-slate-200 font-bold">{c.ancienSolde || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Statut Initial</span>
                    <span className="text-slate-200 font-bold">{c.statutInitial || 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Matières d'Enseignement */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-[2.5rem] p-8 shadow-sm group">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shadow-inner">
              <BookOpen size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Matières d'Enseignement</h2>
              <p className="text-sm text-slate-500 font-medium italic">Base de données globale des disciplines</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button 
                variant="outline" 
                disabled={isPending || !canEdit}
                onClick={() => {
                   const input = prompt("Importer des matières (Séparez par des virgules) :\nEx: Mathématiques, Physique, Arabe");
                   if (input && input.trim()) {
                      const list = input.split(",").map(s => s.trim()).filter(Boolean);
                      startTransition(async () => {
                         const res = await importSubjects(list, subjectSectionId ? Number(subjectSectionId) : undefined);
                         if (res.success) {
                           setSubjectsList((prev: any[]) => [
                             ...prev,
                             ...list.map((name, i) => ({ id: Date.now() + i, subjectName: name, category: null, subjectCode: null }))
                           ]);
                           toast.success(`${list.length} matière(s) importée(s) avec succès`);
                           router.refresh();
                         }
                      });
                   }
                }}
                className="h-12 rounded-xl border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 px-6 font-bold disabled:opacity-50"
             >
                <FileUp size={18} /> Importer
             </Button>
             <Button 
                onClick={handleCreateSubject} 
                disabled={isPending || !subjectName || !canEdit} 
                className="h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl px-8 font-black shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
             >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : "+ Ajouter"}
             </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#181924]/50 p-6 rounded-3xl border border-slate-800/30">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Niveau d'Étude</label>
            <select 
              value={subjectNiveau}
              onChange={(e) => {
                setSubjectNiveau(e.target.value);
                setSubjectSectionId("");
              }}
              className="w-full bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-purple-500"
            >
              <option value="">Tous les niveaux</option>
              {educationalLevelsList?.map((l: any) => (
                <option key={l.id} value={l.levelName}>{l.levelName}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Section / Filière spécifique</label>
            <select 
              value={subjectSectionId}
              onChange={(e) => setSubjectSectionId(e.target.value)}
              className="w-full bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-purple-500"
            >
              <option value="">Global (Toutes les sections)</option>
              {sectionsList
                ?.filter((s: any) => !subjectNiveau || s.educationalLevel === subjectNiveau)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>{s.sectionName}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="relative mb-8">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-500 transition-colors" size={20} />
           <input 
              type="text" 
              placeholder="Rechercher une matière par son nom..."
              value={subjectName || subjectSearch}
              onChange={(e) => {
                 setSubjectName(e.target.value);
                 setSubjectSearch(e.target.value);
              }}
              className="w-full bg-[#181924] border border-slate-800 text-white rounded-[1.25rem] pl-14 pr-4 h-16 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-lg placeholder:text-slate-600 shadow-inner"
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
          {subjectsList
            .filter((s: any) => s.subjectName.toLowerCase().includes(subjectSearch.toLowerCase()))
            .map((s: any) => (
            <div key={s.id} className="flex flex-col gap-4 p-6 rounded-[2rem] bg-[#181924] border border-slate-800/50 hover:border-purple-500/40 transition-all hover:bg-[#1c1d29] group/item relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl -mr-12 -mt-12 group-hover/item:bg-purple-500/10 transition-colors"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 text-purple-400 flex items-center justify-center text-sm font-black shadow-sm group-hover/item:bg-purple-500 group-hover/item:text-white transition-all">
                      {s.subjectName.substring(0, 2).toUpperCase()}
                   </div>
                   <span className="text-slate-200 font-black text-xl tracking-tight">{s.subjectName}</span>
                </div>
                <button 
                  onClick={() => handleDeleteSubject(s.id, s.subjectName)}
                  disabled={isPending}
                  className="text-slate-600 hover:text-rose-500 transition-all p-2.5 hover:bg-rose-500/10 rounded-2xl opacity-0 group-hover/item:opacity-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              {/* Classes and Sections links */}
              <div className="flex flex-wrap gap-2 mt-auto relative z-10">
                 {s.classLinks && s.classLinks.length > 0 ? (
                    s.classLinks.map((link: any) => (
                       <div key={link.id} className="group/tag flex items-center gap-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 px-3 py-1.5 rounded-xl transition-all cursor-default">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-[11px] text-indigo-400 font-black uppercase tracking-wider">
                             {link.class?.section?.sectionName} {link.class?.className}
                          </span>
                       </div>
                    ))
                 ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/30 border border-slate-800/50">
                       <span className="text-[10px] text-slate-600 font-bold italic">Aucune assignation active</span>
                    </div>
                 )}
              </div>
            </div>
          ))}
          
          {(subjectsList.length === 0 || subjectsList.filter((s: any) => s.subjectName.toLowerCase().includes(subjectSearch.toLowerCase())).length === 0) && (
             <div className="col-span-full py-20 text-center space-y-4 bg-[#181924]/50 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                <div className="w-20 h-20 rounded-3xl bg-slate-800/50 mx-auto flex items-center justify-center text-slate-700 shadow-inner">
                   <BookOpen size={40} />
                </div>
                <div>
                   <p className="text-slate-400 text-lg font-bold">Aucune matière trouvée</p>
                   <p className="text-slate-600 text-sm font-medium">Commencez par ajouter ou importer des matières</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* 5. Lien Matières ↔ Sections (Propagation Intelligente) - CARDS DESIGN */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-inner">
              <LinkIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Lien Matières ↔ Sections
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Propagation Intelligente
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Définissez les matières, coefficients et périodes associées par section sous forme de بطاقات (Cartes interactives)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={handleClearSectionSubjects}
              disabled={isPending || sectionSubjectsList.length === 0}
              variant="outline"
              className="h-11 border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl px-4 font-bold flex items-center gap-2"
            >
              <Trash2 size={16} />
              <span>Vider les liens ({sectionSubjectsList.length})</span>
            </Button>
            <Button 
              onClick={() => setShowSectionLinkBuilder(!showSectionLinkBuilder)}
              className="h-11 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-5 font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/30"
            >
              {showSectionLinkBuilder ? <X size={16} /> : <Plus size={16} />}
              <span>{showSectionLinkBuilder ? "Fermer le constructeur" : "+ Nouvelle Association (Carte)"}</span>
            </Button>
          </div>
        </div>

        {/* Builder Panel / Card Form */}
        {showSectionLinkBuilder && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-cyan-500/30 shadow-2xl space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Sparkles size={16} /> Constructeur d'Association par Cartes
              </span>
              <button onClick={() => setShowSectionLinkBuilder(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Step 1: Section */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">1. Section Cible</label>
                <select 
                  value={linkSectionId}
                  onChange={(e) => setLinkSectionId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="">-- Choisir une Section --</option>
                  {sectionsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.sectionName} ({s.educationalLevel || 'Tous'})</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Period */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">2. Période</label>
                <select 
                  value={linkPeriod}
                  onChange={(e) => setLinkPeriod(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="Tous">Toutes les Périodes (Tous)</option>
                  {periodsList?.map((p: any) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {(!periodsList || periodsList.length === 0) && (
                    <>
                      <option value="1er Trimestre">1er Trimestre</option>
                      <option value="2ème Trimestre">2ème Trimestre</option>
                      <option value="3ème Trimestre">3ème Trimestre</option>
                      <option value="1er Semestre">1er Semestre</option>
                      <option value="2ème Semestre">2ème Semestre</option>
                    </>
                  )}
                </select>
              </div>

              {/* Step 3: Subject */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">3. Matière</label>
                <select 
                  value={linkSubjectId}
                  onChange={(e) => setLinkSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="">-- Choisir une Matière --</option>
                  {subjectsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              {/* Step 4: Coef & Éliminatoire */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">4. Coef & Option</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min="1"
                      value={linkCoef}
                      onChange={(e) => setLinkCoef(e.target.value)}
                      className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 text-center font-black text-lg"
                      placeholder="Coef"
                    />
                  </div>
                  <label className="flex items-center gap-2 h-12 px-3 rounded-xl bg-[#1F222B] border border-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={linkEliminatory}
                      onChange={(e) => setLinkEliminatory(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 accent-rose-500"
                    />
                    <span className="text-xs font-bold text-rose-400">Éliminatoire</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Presets Coef Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Presets Coef:</span>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLinkCoef(num.toString())}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${linkCoef === num.toString() ? 'bg-cyan-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <Button 
                onClick={() => handleLinkSubject()} 
                disabled={isPending || !linkSectionId || !linkSubjectId} 
                className="h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl px-8 font-black shadow-lg shadow-cyan-900/30"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Valider et Propager la Carte</span>
              </Button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-2xl bg-[#161822] border border-slate-800/60">
          {/* Section Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setSectionSubjectFilterSection("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${sectionSubjectFilterSection === "all" ? "bg-cyan-500 text-white shadow-md" : "bg-[#1F222B] text-slate-400 hover:text-white border border-slate-800"}`}
            >
              Toutes les Sections ({sectionSubjectsList.length})
            </button>
            {sectionsList.map((sec: any) => {
              const count = sectionSubjectsList.filter((ss: any) => ss.sectionId === sec.id).length;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSectionSubjectFilterSection(sec.id.toString())}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${sectionSubjectFilterSection === sec.id.toString() ? "bg-cyan-500 text-white shadow-md" : "bg-[#1F222B] text-slate-400 hover:text-white border border-slate-800"}`}
                >
                  {sec.sectionName} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Filtrer les cartes..."
              value={sectionSubjectSearch}
              onChange={(e) => setSectionSubjectSearch(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl pl-9 pr-3 h-9 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Section Subjects Cards Grid */}
        {(() => {
          const filteredLinks = sectionSubjectsList.filter((ss: any) => {
            const matchSec = sectionSubjectFilterSection === "all" || ss.sectionId?.toString() === sectionSubjectFilterSection;
            const q = sectionSubjectSearch.toLowerCase();
            const matchSearch = !q || (ss.subject?.subjectName?.toLowerCase().includes(q) || ss.section?.sectionName?.toLowerCase().includes(q) || ss.term?.toLowerCase().includes(q));
            return matchSec && matchSearch;
          });

          if (filteredLinks.length === 0) {
            return (
              <div className="py-12 text-center bg-[#161822]/60 rounded-2xl border border-dashed border-slate-800">
                <BookOpen className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold">Aucune carte d'association trouvée</p>
                <p className="text-slate-600 text-xs mt-1">Utilisez "+ Nouvelle Association" pour lier des matières aux sections</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLinks.map((ss: any) => (
                <div 
                  key={ss.id} 
                  className="group bg-[#161822] hover:bg-[#1a1c29] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-300 shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Layers size={11} /> {ss.section?.sectionName || 'Section'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-bold">
                      📅 {ss.term || 'Tous'}
                    </span>
                  </div>

                  {/* Body Subject */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm shrink-0">
                      {ss.subject?.subjectName?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-base truncate leading-tight group-hover:text-cyan-300 transition-colors">
                        {ss.subject?.subjectName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">Propagation par Section</p>
                    </div>
                  </div>

                  {/* Footer Coef & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black">
                        Coef {ss.defaultCoef}
                      </span>
                      {ss.isEliminatory && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black">
                          Éliminatoire
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingSectionLink(ss);
                          setEditLinkSectionId(ss.sectionId?.toString() || "");
                          setEditLinkPeriod(ss.term || "Tous");
                          setEditLinkSubjectId(ss.subjectId?.toString() || "");
                          setEditLinkCoef((ss.defaultCoef || 1).toString());
                          setEditLinkEliminatory(!!ss.isEliminatory);
                        }}
                        disabled={isPending}
                        title="Modifier la carte"
                        className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-slate-700/50 hover:border-cyan-500/40 flex items-center justify-center transition-all"
                      >
                        <Pencil size={13} />
                      </button>
                      <button 
                        onClick={() => handleDeleteSectionLink(ss.id)}
                        disabled={isPending}
                        title="Supprimer la carte"
                        className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/40 flex items-center justify-center transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Edit Modal Panel for Section Link */}
        {editingSectionLink && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-cyan-500/50 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Pencil size={16} /> Modifier la Carte : <span className="text-white underline">{editingSectionLink.subject?.subjectName}</span>
              </span>
              <button onClick={() => setEditingSectionLink(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Section</label>
                <select 
                  value={editLinkSectionId}
                  onChange={(e) => setEditLinkSectionId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  {sectionsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.sectionName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Période</label>
                <select 
                  value={editLinkPeriod}
                  onChange={(e) => setEditLinkPeriod(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="Tous">Toutes les Périodes (Tous)</option>
                  {periodsList?.map((p: any) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {(!periodsList || periodsList.length === 0) && (
                    <>
                      <option value="1er Trimestre">1er Trimestre</option>
                      <option value="2ème Trimestre">2ème Trimestre</option>
                      <option value="3ème Trimestre">3ème Trimestre</option>
                      <option value="1er Semestre">1er Semestre</option>
                      <option value="2ème Semestre">2ème Semestre</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Matière</label>
                <select 
                  value={editLinkSubjectId}
                  onChange={(e) => setEditLinkSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  {subjectsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Coef & Option</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1"
                    value={editLinkCoef}
                    onChange={(e) => setEditLinkCoef(e.target.value)}
                    className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 text-center font-black text-lg"
                  />
                  <label className="flex items-center gap-2 h-12 px-3 rounded-xl bg-[#1F222B] border border-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={editLinkEliminatory}
                      onChange={(e) => setEditLinkEliminatory(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 accent-rose-500"
                    />
                    <span className="text-xs font-bold text-rose-400">Éliminatoire</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setEditingSectionLink(null)} variant="outline" className="h-11 border-slate-800 text-slate-400 rounded-xl px-5">
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateSectionLink}
                disabled={isPending}
                className="h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl px-7 font-black shadow-lg shadow-cyan-900/30 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Enregistrer la modification</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Plan d'Études (Lien Classe-Matière) - CARDS DESIGN */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Plan d'Études (Lien Classe-Matière)
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cartes de Classes
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Gérez le plan d'études sous forme de بطاقات (Cartes de classes) avec leurs matières et coefficients</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={handleClearClassSubjects}
              disabled={isPending || classSubjectsList.length === 0}
              variant="outline"
              className="h-11 border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl px-4 font-bold flex items-center gap-2 shrink-0"
            >
              <Trash2 size={16} />
              <span>Vider le Plan ({classSubjectsList.length})</span>
            </Button>
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text"
                placeholder="Rechercher classe ou matière..."
                value={classPlanSearch}
                onChange={(e) => setClassPlanSearch(e.target.value)}
                className="w-full bg-[#161822] border border-slate-800 text-white rounded-xl pl-9 pr-3 h-11 text-xs focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Modal / Quick Add Drawer for a Specific Class Card */}
        {selectedClassForModal && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-emerald-500/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <Plus size={16} /> Assigner une Matière à la classe : <span className="text-white underline">{selectedClassForModal.className}</span>
              </span>
              <button onClick={() => setSelectedClassForModal(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Choisir la Matière</label>
                <select 
                  value={planSubjectId}
                  onChange={(e) => setPlanSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 font-bold text-sm"
                >
                  <option value="">-- Sélectionner --</option>
                  {subjectsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Coefficient de la Classe</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={planCoef}
                    onChange={(e) => setPlanCoef(e.target.value)}
                    className="flex-1 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 text-center font-black text-lg"
                  />
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlanCoef(n.toString())}
                      className={`w-9 h-12 rounded-xl text-xs font-black transition-all ${planCoef === n.toString() ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setSelectedClassForModal(null)} variant="outline" className="h-11 border-slate-800 text-slate-400 rounded-xl px-5">
                Annuler
              </Button>
              <Button 
                onClick={() => handleAddPlanLink(selectedClassForModal.id.toString())}
                disabled={isPending || !planSubjectId}
                className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-7 font-black shadow-lg shadow-emerald-900/30 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Confirmer l'assignation</span>
              </Button>
            </div>
          </div>
        )}

        {/* Edit Modal Panel for Class Subject Link */}
        {editingClassSubject && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-emerald-500/50 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <Pencil size={16} /> Modifier le Coefficient de la Matière : <span className="text-white underline">{editingClassSubject.subject?.subjectName}</span> ({editingClassSubject.class?.className})
              </span>
              <button onClick={() => setEditingClassSubject(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Matière</label>
                <select 
                  value={editClassSubjectId}
                  onChange={(e) => setEditClassSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 font-bold text-sm"
                >
                  {subjectsList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Nouveau Coefficient</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={editClassCoef}
                    onChange={(e) => setEditClassCoef(e.target.value)}
                    className="flex-1 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 text-center font-black text-lg"
                  />
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditClassCoef(n.toString())}
                      className={`w-9 h-12 rounded-xl text-xs font-black transition-all ${editClassCoef === n.toString() ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setEditingClassSubject(null)} variant="outline" className="h-11 border-slate-800 text-slate-400 rounded-xl px-5">
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateClassSubjectLink}
                disabled={isPending}
                className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-7 font-black shadow-lg shadow-emerald-900/30 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Enregistrer la modification</span>
              </Button>
            </div>
          </div>
        )}

        {/* Master Class Cards Grid */}
        {(() => {
          const q = classPlanSearch.toLowerCase();
          const filteredClasses = classesList.filter((c: any) => {
            if (!q) return true;
            const matchClassName = c.className?.toLowerCase().includes(q);
            const matchSectionName = c.section?.sectionName?.toLowerCase().includes(q);
            const assignedSubs = classSubjectsList.filter((cs: any) => cs.classId === c.id);
            const matchSubjectName = assignedSubs.some((cs: any) => cs.subject?.subjectName?.toLowerCase().includes(q));
            return matchClassName || matchSectionName || matchSubjectName;
          });

          if (filteredClasses.length === 0) {
            return (
              <div className="py-12 text-center bg-[#161822]/60 rounded-2xl border border-dashed border-slate-800">
                <GraduationCap className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold">Aucune classe trouvée</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredClasses.map((cls: any) => {
                const clsSubjects = classSubjectsList.filter((cs: any) => cs.classId === cls.id);
                const totalCoefSum = clsSubjects.reduce((acc: number, cs: any) => acc + Number(cs.coefficient || 1), 0);

                return (
                  <div 
                    key={cls.id} 
                    className="bg-[#161822] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg space-y-4 transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Class Card Header */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg">
                          {cls.className?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight flex items-center gap-2">
                            {cls.className}
                            {cls.section?.sectionName && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                                {cls.section.sectionName}
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {clsSubjects.length} Matière{clsSubjects.length !== 1 ? 's' : ''} • Total Coef: <span className="text-emerald-400 font-bold">{totalCoefSum}</span>
                          </p>
                        </div>
                      </div>

                      <Button 
                        onClick={() => setSelectedClassForModal(cls)}
                        size="sm"
                        className="h-9 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl px-3 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} />
                        <span>+ Assigner</span>
                      </Button>
                    </div>

                    {/* Class Card Body - Subject Mini Cards */}
                    <div className="flex-1">
                      {clsSubjects.length === 0 ? (
                        <div className="py-6 text-center rounded-xl bg-[#1F222B]/40 border border-dashed border-slate-800/80">
                          <p className="text-xs text-slate-500 font-medium mb-2">Aucune matière dans cette classe</p>
                          <button 
                            onClick={() => setSelectedClassForModal(cls)}
                            className="text-xs text-emerald-400 font-bold hover:underline"
                          >
                            + Assigner une matière maintenant
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {clsSubjects.map((cs: any) => (
                            <div 
                              key={cs.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-[#1F222B] border border-slate-800/60 hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <BookOpen size={14} className="text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-200 truncate" title={cs.subject?.subjectName}>
                                  {cs.subject?.subjectName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-[11px] font-black">
                                  Coef {cs.coefficient}
                                </span>
                                <button 
                                  onClick={() => {
                                    setEditingClassSubject(cs);
                                    setEditClassCoef((cs.coefficient || 1).toString());
                                    setEditClassSubjectId(cs.subjectId?.toString() || "");
                                  }}
                                  disabled={isPending}
                                  title="Modifier le coefficient"
                                  className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteClassSubjectLink(cs.id)}
                                  disabled={isPending}
                                  title="Supprimer"
                                  className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 7. Grille de Notation (Barème) */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-indigo-500" />
          <h2 className="text-xl font-bold text-white">Grille de Notation (Barème)</h2>
        </div>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom (ex: Excellent)"
            value={gradingName}
            onChange={(e) => setGradingName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500"
          />
          <input 
            type="number" 
            placeholder="Score min (ex: 18)"
            value={gradingScore}
            onChange={(e) => setGradingScore(e.target.value)}
            className="w-32 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500"
          />
          <Button onClick={handleCreateGrading} disabled={isPending || !gradingName} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {gradingList.map((ga: any) => (
            <div key={ga.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <div className="flex items-center gap-4">
                <span className="text-slate-300 font-medium">{ga.name}</span>
                <span className="text-xs bg-indigo-900/30 text-indigo-400 border border-indigo-800/50 px-2 py-1 rounded-full font-bold">Min: {ga.baseScore}</span>
              </div>
              <button 
                onClick={() => {
                  setGradingList((prev: any[]) => prev.filter((item: any) => item.id !== ga.id));
                  startTransition(async () => {
                    const res = await deleteGradingAppreciation(ga.id);
                    if (res.success) {
                      toast.success("Appréciation supprimée");
                      router.refresh();
                    } else {
                      toast.error(res.error || "Erreur lors de la suppression");
                    }
                  });
                }}
                disabled={isPending}
                className="text-rose-500/70 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Appréciations de Conduite */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="text-rose-500" />
          <h2 className="text-xl font-bold text-white">Appréciations de Conduite / Travail</h2>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
          <select 
            value={remarkCategory}
            onChange={(e) => setRemarkCategory(e.target.value)}
            className="w-40 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
          >
            <option value="Conduite">Conduite</option>
            <option value="Travail">Travail</option>
            <option value="Assiduité">Assiduité</option>
            <option value="Honneur">Tableau d'Honneur</option>
          </select>
          <input 
            type="text" 
            placeholder="Contenu (ex: BIEN, AVERTISSEMENT)"
            value={remarkContent}
            onChange={(e) => setRemarkContent(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-rose-500"
          />
          <select 
            value={remarkSectionId}
            onChange={(e) => setRemarkSectionId(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
          >
            <option value="">Toutes Sections</option>
            {sectionsList.map((s: any) => (
              <option key={s.id} value={s.id}>{s.sectionName}</option>
            ))}
          </select>
          <Button onClick={handleCreateRemark} disabled={isPending || !remarkContent} className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {remarksList.map((sr: any) => (
            <div key={sr.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <div className="flex items-center gap-4">
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{sr.category}</span>
                <span className="text-slate-300 font-medium">{sr.content}</span>
                {sr.section && <span className="text-xs text-slate-500">Section: {sr.section.sectionName}</span>}
              </div>
              <button 
                onClick={() => {
                  setRemarksList((prev: any[]) => prev.filter((item: any) => item.id !== sr.id));
                  startTransition(async () => {
                    const res = await deleteSchoolRemark(sr.id);
                    if (res.success) {
                      toast.success("Remarque supprimée");
                      router.refresh();
                    } else {
                      toast.error(res.error || "Erreur lors de la suppression");
                    }
                  });
                }}
                disabled={isPending}
                className="text-rose-500/70 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
