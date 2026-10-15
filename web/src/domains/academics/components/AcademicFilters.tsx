"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

import { getFilterOptions } from "../actions/academics.actions";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

interface AcademicFiltersProps {
  onLoad: (filters: any) => void;
  loading?: boolean;
}

function getAcademicLevels(data: any) {
  const values = data?.levels && data.levels.length > 0
    ? data.levels.map((l: any) => l.levelName)
    : Array.from(new Set((data?.sections || []).map((s: any) => s.educationalLevel || "Lycée"))) as string[];

  return values.length > 0 ? values : ["Lycée"];
}

function normalizeFilterText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


const EMPTY_FILTER_OPTIONS: {
  sessions: any[];
  sections: any[];
  classes: any[];
  subjects: any[];
  classSubjectLinks: any[];
  sectionSubjectLinks: any[];
  periods: any[];
  levels: any[];
} = {
  sessions: [],
  sections: [],
  classes: [],
  subjects: [],
  classSubjectLinks: [],
  sectionSubjectLinks: [],
  periods: [],
  levels: [],
};

type AcademicFilterOptions = typeof EMPTY_FILTER_OPTIONS;
const ACADEMIC_FILTER_STORAGE_KEY = "academic_filter_options_v2";

async function cacheAcademicFilterOptions(data: AcademicFilterOptions) {
  const { cacheReferenceItems } = await import("@/infrastructure/local-db/references");
  await Promise.all([
    cacheReferenceItems("session", data.sessions || [], "sessionName"),
    cacheReferenceItems("period", data.periods || [], "name"),
    cacheReferenceItems("section", data.sections || [], "sectionName"),
    cacheReferenceItems("class", data.classes || [], "className"),
    cacheReferenceItems("subject", data.subjects || [], "subjectName"),
    cacheReferenceItems("exams" as any, [{
      id: "academic-filter-options",
      label: "academic-filter-options",
      classSubjectLinks: data.classSubjectLinks || [],
      sectionSubjectLinks: data.sectionSubjectLinks || [],
      levels: data.levels || [],
      updatedAt: Date.now(),
    }], "label"),
  ]);
}

async function getCachedAcademicFilterOptions(): Promise<AcademicFilterOptions | null> {
  const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
  const [sessions, periods, sections, classes, subjects, meta] = await Promise.all([
    getCachedReferenceItems<any>("session"),
    getCachedReferenceItems<any>("period"),
    getCachedReferenceItems<any>("section"),
    getCachedReferenceItems<any>("class"),
    getCachedReferenceItems<any>("subject"),
    getCachedReferenceItems<any>("exams" as any),
  ]);

  const filterMeta = meta.find((item: any) => item.id === "academic-filter-options" || item.label === "academic-filter-options") || {};
  const cached = {
    sessions,
    periods,
    sections,
    classes,
    subjects,
    classSubjectLinks: filterMeta.classSubjectLinks || [],
    sectionSubjectLinks: filterMeta.sectionSubjectLinks || [],
    levels: filterMeta.levels || [],
  };

  const hasCoreData = cached.sessions.length > 0 || cached.sections.length > 0 || cached.classes.length > 0 || cached.subjects.length > 0;
  return hasCoreData ? cached : null;
}

export default function AcademicFilters({ onLoad, loading }: AcademicFiltersProps) {
  const [options, setOptions] = useState<any>({
    sessions: [],
    sections: [],
    classes: [],
    subjects: [],
    classSubjectLinks: [],
    sectionSubjectLinks: [],
    periods: [],
    levels: [],
  });

  const [session, setSession] = useState("");
  const [level, setLevel] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [period, setPeriod] = useState("");

  useEffect(() => {
    let cancelled = false;

    const applyOptions = (data: any) => {
      if (cancelled || !data) return;
      const normalized = { ...EMPTY_FILTER_OPTIONS, ...data };
      setOptions(normalized);

      if (normalized.sessions?.length > 0) {
        const activeSession = normalized.sessions.find((s: any) => s.isActive) || normalized.sessions[0];
        setSession((current) => current || activeSession.id.toString());
      }

      const availableLevels = getAcademicLevels(normalized);
      setLevel((current) => current && availableLevels.includes(current) ? current : String(availableLevels[0] || ""));
    };

    async function loadOptions() {
      const sessionCached = sessionStorage.getItem(ACADEMIC_FILTER_STORAGE_KEY);
      let hasSessionCache = false;

      if (sessionCached) {
        try {
          applyOptions(JSON.parse(sessionCached));
          hasSessionCache = true;
        } catch (e) {
          console.error("Failed to parse cached options", e);
        }
      }

      if (navigator.onLine) {
        try {
          const result = await getFilterOptions();
          const data = (result as any)?.data || result;

          if (data && data.sessions) {
            const normalized = { ...EMPTY_FILTER_OPTIONS, ...data };
            applyOptions(normalized);
            sessionStorage.setItem(ACADEMIC_FILTER_STORAGE_KEY, JSON.stringify(normalized));
            await cacheAcademicFilterOptions(normalized);
            return;
          }
        } catch (error) {
          console.warn("[AcademicFilters] Fresh options failed, trying local cache:", error);
        }

        const localCached = await getCachedAcademicFilterOptions();
        if (localCached) {
          applyOptions(localCached);
          toast.warning("Connexion active, mais les filtres centraux sont indisponibles; affichage du cache local.");
        } else if (hasSessionCache) {
          toast.warning("Impossible d'actualiser les filtres académiques; affichage temporaire du cache de session.");
        } else {
          toast.error("Impossible de charger les filtres académiques.");
        }
        return;
      }

      const localCached = await getCachedAcademicFilterOptions();
      if (localCached) {
        applyOptions(localCached);
        toast.info("Filtres académiques chargés depuis le cache hors-ligne.");
      } else if (!hasSessionCache) {
        toast.warning("Aucun cache local disponible pour les filtres Notes & Résultats.");
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate filtered sections with level family compatibility
  const filteredSections = useMemo(() => {
    const selectedNorm = normalizeFilterText(level);
    if (!selectedNorm) return options.sections || [];

    const isLevelMatch = (secLevel: string, targetLevel: string) => {
      const sNorm = normalizeFilterText(secLevel);
      const tNorm = normalizeFilterText(targetLevel);
      if (sNorm === tNorm) return true;

      const isUnivTarget = tNorm.includes("univ") || tNorm.includes("super") || tNorm.includes("licence") || tNorm.includes("lmd") || tNorm.includes("master") || tNorm.includes("doc");
      const isUnivSec = sNorm.includes("univ") || sNorm.includes("super") || sNorm.includes("licence") || sNorm.includes("lmd") || sNorm.includes("master") || sNorm.includes("doc");
      if (isUnivTarget && isUnivSec) return true;

      const isLyceeTarget = tNorm.includes("lyc") || tNorm.includes("sec");
      const isLyceeSec = sNorm.includes("lyc") || sNorm.includes("sec");
      if (isLyceeTarget && isLyceeSec) return true;

      const isCollegeTarget = tNorm.includes("colleg") || tNorm.includes("moyen");
      const isCollegeSec = sNorm.includes("colleg") || sNorm.includes("moyen");
      if (isCollegeTarget && isCollegeSec) return true;

      const isPrimTarget = tNorm.includes("prim") || tNorm.includes("matern") || tNorm.includes("elem");
      const isPrimSec = sNorm.includes("prim") || sNorm.includes("matern") || sNorm.includes("elem");
      if (isPrimTarget && isPrimSec) return true;

      return false;
    };

    return (options.sections || []).filter((s: any) => {
      return isLevelMatch(s.educationalLevel || "Lycée", level);
    });
  }, [level, options.sections]);

  // Calculate filtered classes
  const filteredClasses = useMemo(() => {
    return options.classes.filter((c: any) => c.sectionId?.toString() === sectionId);
  }, [sectionId, options.classes]);

  // Calculate filtered subjects by merging both class-specific links (Plan d'Études) AND section-specific links
  const filteredSubjects = useMemo(() => {
    const classSubIds = (options.classSubjectLinks || [])
      .filter((l: any) => l.classId?.toString() === classId)
      .map((l: any) => l.subjectId?.toString());

    let sectionSubIds: string[] = [];
    if (classId) {
      const cls = options.classes.find((c: any) => c.id.toString() === classId);
      if (cls?.sectionId) {
        sectionSubIds = (options.sectionSubjectLinks || [])
          .filter((l: any) => l.sectionId?.toString() === cls.sectionId.toString())
          .map((l: any) => l.subjectId?.toString());
      }
    }

    const mergedIds = Array.from(new Set([...classSubIds, ...sectionSubIds]));

    return options.subjects.filter((s: any) =>
      mergedIds.length === 0 ? Boolean(classId) : mergedIds.includes(s.id.toString())
    );
  }, [classId, sectionId, options.classSubjectLinks, options.sectionSubjectLinks, options.subjects, options.classes]);

  // Handle Level -> Section auto-selection
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!filteredSections.find((s: any) => s.id.toString() === sectionId)) {
        setSectionId(filteredSections[0].id.toString());
      }
    } else {
      setSectionId("");
    }
  }, [level, filteredSections]);

  // Handle Section -> Class auto-selection
  useEffect(() => {
    if (filteredClasses.length > 0) {
      if (!filteredClasses.find((c: any) => c.id.toString() === classId)) {
        setClassId(filteredClasses[0].id.toString());
      }
    } else {
      setClassId("");
    }
  }, [sectionId, filteredClasses]);

  // Handle Class -> Subject auto-selection
  useEffect(() => {
    if (filteredSubjects.length > 0) {
      if (!filteredSubjects.find((s: any) => s.id.toString() === subjectId)) {
        setSubjectId(filteredSubjects[0].id.toString());
      }
    } else {
      setSubjectId("");
    }
  }, [classId, filteredSubjects]);

  const levels = useMemo(() => getAcademicLevels(options), [options]);

  const handleLoad = () => {
    if (!session || !level || !sectionId || !classId || !subjectId || !period) {
      alert("Veuillez sélectionner tous les filtres.");
      return;
    }

    const selectedSession = options.sessions.find((s: any) => s.id.toString() === session);
    const selectedClass = options.classes.find((c: any) => c.id.toString() === classId);

    onLoad({
      sessionId: parseInt(session),
      sessionName: selectedSession?.sessionName || "",
      level,
      sectionId: parseInt(sectionId),
      classId: parseInt(classId),
      className: getClassDisplayName(selectedClass, ""),
      subjectId: parseInt(subjectId),
      period
    });
  };

  const mapToOptions = (items: any[], nameKey: string, altKey?: string) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item: any) => {
      const name =
        item[nameKey] ||
        (altKey ? item[altKey] : "") ||
        item.sessionName ||
        item.session_name ||
        item.sectionName ||
        item.section_name ||
        item.subjectName ||
        item.subject_name ||
        item.className ||
        item.class_name ||
        item.name ||
        item.title ||
        item.label ||
        `Élément ${item.id ?? ""}`;
      return {
        id: (item.id !== undefined && item.id !== null ? item.id : item.value ?? "").toString(),
        name: name.toString().trim()
      };
    });
  };

  const currentSection = options.sections.find((s: any) => s.id.toString() === sectionId);

  // Smart period options based on level:
  // - Primaire: 3 Trimestres (1er Trimestre, 2ème Trimestre, 3ème Trimestre)
  // - Collège & Lycée: 2 Semestres (1er Semestre, 2ème Semestre)
  // - Licence (LMD), Master & Doctorat: 14 Semestres (1er Semestre (S1) ... 14ème Semestre (S14))
  const periodOptions = useMemo(() => {
    const normLevel = String(level || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const isPrimaire = normLevel.includes("prim") || normLevel.includes("matern") || normLevel.includes("fonda") || normLevel.includes("elem");
    const isSuperior = normLevel.includes("licence") || normLevel.includes("lmd") || normLevel.includes("master") || normLevel.includes("doc") || normLevel.includes("super") || normLevel.includes("univ");

    let sessionPeriods = (options.periods || []).filter((p: any) =>
      !p.sessionId || p.sessionId === 0 || String(p.sessionId) === "" || p.sessionId?.toString() === session
    );
    if (sessionPeriods.length === 0 && options.periods?.length > 0) {
      sessionPeriods = options.periods;
    }

    if (isPrimaire) {
      const dbTrimestres = sessionPeriods.filter((p: any) =>
        p.periodType === "Trimestre" || String(p.name).toLowerCase().includes("trimestre")
      );
      if (dbTrimestres.length > 0) {
        return dbTrimestres.map((p: any) => ({ id: p.name, name: p.name }));
      }
      return [
        { id: "1er Trimestre", name: "1er Trimestre" },
        { id: "2ème Trimestre", name: "2ème Trimestre" },
        { id: "3ème Trimestre", name: "3ème Trimestre" },
      ];
    }

    if (isSuperior) {
      const dbSuperior = sessionPeriods.filter((p: any) =>
        p.periodType === "Semestre" || String(p.name).toLowerCase().includes("semest") || /^s\d+/i.test(p.name)
      );

      const superiorPresets = Array.from({ length: 14 }, (_, i) => {
        const num = i + 1;
        const label = `${num === 1 ? "1er" : `${num}ème`} Semestre (S${num})`;
        return { id: label, name: label };
      });

      if (dbSuperior.length > 0) {
        const dbList = dbSuperior.map((p: any) => ({ id: p.name, name: p.name }));
        return dbList.length >= 6 ? dbList : superiorPresets;
      }
      return superiorPresets;
    }

    // Default for Collège / Lycée -> 2 Semestres
    const dbSemestres = sessionPeriods.filter((p: any) =>
      p.periodType === "Semestre" || String(p.name).toLowerCase().includes("semest")
    );

    if (dbSemestres.length > 0) {
      const collegePeriods = dbSemestres
        .filter((p: any) => {
          const n = String(p.name).toLowerCase();
          return n.includes("1") || n.includes("2") || n.includes("premiere") || n.includes("deuxieme");
        })
        .map((p: any) => ({ id: p.name, name: p.name }));

      if (collegePeriods.length >= 2) {
        return collegePeriods.slice(0, 2);
      }
    }

    return [
      { id: "1er Semestre", name: "1er Semestre" },
      { id: "2ème Semestre", name: "2ème Semestre" },
    ];
  }, [level, session, options.periods]);

  // Auto-update period if current value is not in options
  useEffect(() => {
    if (periodOptions.length > 0) {
      if (!periodOptions.find((p: any) => p.id === period)) {
        setPeriod(periodOptions[0].id);
      }
    }
  }, [periodOptions]);

  return (
    <div className="bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg p-8 print:hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
          <Filter size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">Filtres Académiques</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
        <FilterGroup
          label="Session"
          value={session}
          onChange={setSession}
          options={mapToOptions(options.sessions, "sessionName", "session_name")}
        />

        <FilterGroup
          label="Niveau"
          value={level}
          onChange={(v: string) => { setLevel(v); }}
          options={levels.map((l: any) => ({ id: l, name: l }))}
        />

        <FilterGroup
          label="Série/Section"
          value={sectionId}
          onChange={setSectionId}
          options={mapToOptions(filteredSections, "sectionName", "section_name")}
        />

        <FilterGroup
          label="Classe"
          value={classId}
          onChange={setClassId}
          options={filteredClasses.map((c: any) => ({
            id: c.id.toString(),
            name: getClassDisplayName(c)
          }))}
        />

        <FilterGroup
          label="Matière"
          value={subjectId}
          onChange={setSubjectId}
          options={mapToOptions(filteredSubjects, "subjectName", "subject_name")}
        />

        <FilterGroup
          label="Période"
          value={period}
          onChange={setPeriod}
          options={periodOptions}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleLoad}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 h-12 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
          <span>Charger la grille</span>
        </Button>
      </div>
    </div>
  );
}

function FilterGroup({ label, value, onChange, options }: any) {
  const selectedItem = options?.find((opt: any) => String(opt.id) === String(value));
  const displayText = selectedItem?.name || (value && options?.length > 0 ? selectedItem?.name : value ? (options?.length === 0 ? "Chargement..." : "") : "Choisir...");

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl h-11 font-medium focus:ring-indigo-500/20">
          <SelectValue placeholder={`Choisir...`}>
            {displayText || "Choisir..."}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-[#131622] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl">
          {options?.map((opt: { id: string, name: string }) => (
            <SelectItem key={opt.id} value={opt.id} className="focus:bg-slate-50 dark:focus:bg-slate-800 focus:text-slate-900 dark:focus:text-white text-slate-900 dark:text-slate-100">
              {opt.name}
            </SelectItem>
          ))}
          {(!options || options.length === 0) && <div className="p-4 text-xs text-slate-500 dark:text-slate-400 text-center">Aucune option</div>}
        </SelectContent>
      </Select>
    </div>
  );
}
