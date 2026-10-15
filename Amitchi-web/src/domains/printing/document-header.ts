export type DocumentHeaderStyle =
  | "classic_dual_logo"
  | "bilingual_center_logo"
  | "university_formal"
  | "modern_card"
  | "minimal_administrative";

export type EducationalLevelKey =
  | "Primaire"
  | "College"
  | "Lycée"
  | "University"
  | "Autre"
  | string;

export type EducationalLevel = EducationalLevelKey;

export type LevelHeaderProfile = {
  id: string;
  name: string;
  branchId?: number | null; // Associated campus / branch ID (null / undefined for global / all campuses)
  branchName?: string | null;
  applicableLevels: EducationalLevelKey[]; // e.g. ["Primaire"], ["College"], ["Lycée"], or ["Primaire", "College"]
  customLogo?: string;
  leftLogo?: string;
  centerLogo?: string;
  rightLogo?: string;
  headerConfig: Partial<DocumentHeaderConfig>;
};

export type DocumentHeaderConfig = {
  style: DocumentHeaderStyle;
  schoolName: string;
  schoolNameAr?: string;
  campusSubtitle?: string;
  campusSubtitleAr?: string;
  country?: string;
  countryAr?: string;
  ministry?: string;
  ministryAr?: string;
  regionalDirection?: string;
  regionalDirectionAr?: string;
  departmentalDirection?: string;
  departmentalDirectionAr?: string;
  inspection?: string;
  inspectionAr?: string;
  commune?: string;
  communeAr?: string;
  schoolCode?: string;
  schoolCodeAr?: string;
  registrationNo?: string;
  service?: string;
  serviceAr?: string;
  address?: string;
  addressAr?: string;
  bp?: string;
  phone?: string;
  email?: string;
  schoolYear?: string;
  motto?: string;
  mottoAr?: string;
  authorizationText?: string;
  leftLogo?: string;
  centerLogo?: string;
  rightLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  titleFont?: string;
  titleSize?: number;
  bilingual?: boolean;
  documentTypes?: string[];
  isDefault?: boolean;
  
  // Official University Legal Visas & Clauses
  vuClauses?: string[];

  // Multi-Level & Custom Profile Extension
  levelProfiles?: LevelHeaderProfile[];
  activeLevelProfileId?: string;
};

export const DEFAULT_LMD_VU_CLAUSES: string[] = [
  "Vu la loi N° 98-12 du 1er Juin 1998, portant Orientation du Système Educatif Nigérien et les textes modifiants subséquents;",
  "Vu l'ordonnance N° 96-035 du 19 Juin 1996 portant réglementation de l'enseignement privé au Niger;",
  "Vu le décret N° 2010-402/PCSRD/MESS/RS du 14 Mai 2010, portant institution du système Licence, Master et Doctorat LMD;",
  "Vu l'arrêté N° 00105/MEMS/SG/DGE/DES/DES/DEPRI du 13 Mai 2013, fixant les conditions et modalités de délivrance des diplômes;",
  "Vu l'arrêté N° 092/MES/R/II/SG/DGE/DL/DESP/DESPRI du 28 Août 2017, portant autorisation de création de l'Université;",
  "Vu la décision du Conseil Universitaire dans son assise en date du présent;",
];

export const DOCUMENT_HEADER_SETTING_KEY = "official_document_header";

export const defaultDocumentHeaderConfig: DocumentHeaderConfig = {
  style: "classic_dual_logo",
  schoolName: "ÉCOLE EXCELLENCE",
  schoolNameAr: "مدرسة التميز",
  campusSubtitle: "",
  campusSubtitleAr: "",
  country: "RÉPUBLIQUE DU NIGER",
  countryAr: "جمهورية النيجر",
  ministry: "Ministère de l'Éducation Nationale",
  ministryAr: "وزارة التربية الوطنية",
  regionalDirection: "Direction Régionale de l'Éducation Nationale",
  regionalDirectionAr: "المديرية الجهوية للتربية الوطنية",
  departmentalDirection: "Direction Départementale de l'Éducation Nationale",
  departmentalDirectionAr: "المديرية الإقليمية للتربية الوطنية",
  inspection: "Inspection de l'Enseignement Primaire & Secondaire",
  inspectionAr: "مفتشية التربية والتعليم",
  commune: "Commune de Niamey IV",
  communeAr: "بلدية نيامي 4",
  schoolCode: "ETB-2026-001",
  service: "Service de la Scolarité",
  serviceAr: "مصلحة شؤون الطلاب",
  schoolYear: "2024 - 2025",
  motto: "Discipline - Travail - Réussite",
  mottoAr: "انضباط - عمل - نجاح",
  primaryColor: "#4f46e5",
  secondaryColor: "#10b981",
  titleFont: "serif",
  titleSize: 26,
  bilingual: false,
  documentTypes: ["reports", "receipts", "transcripts", "certificates", "cards"],
  isDefault: true,
  vuClauses: DEFAULT_LMD_VU_CLAUSES,
  levelProfiles: [],
};

export function mergeDocumentHeaderConfig(input?: Partial<DocumentHeaderConfig> | null): DocumentHeaderConfig {
  const rawProfiles = Array.isArray(input?.levelProfiles) ? input.levelProfiles : [];
  const safeProfiles: LevelHeaderProfile[] = rawProfiles.map((p: any, idx: number) => ({
    id: String(p?.id || `profile_${idx}`),
    name: String(p?.name || "Profil sans nom"),
    branchId: p?.branchId !== undefined && p?.branchId !== null && p?.branchId !== "all" && !isNaN(Number(p.branchId)) ? Number(p.branchId) : null,
    branchName: p?.branchName ? String(p.branchName) : null,
    applicableLevels: Array.isArray(p?.applicableLevels)
      ? p.applicableLevels.map(String)
      : typeof p?.applicableLevels === "string" && p.applicableLevels
      ? [p.applicableLevels]
      : [],
    leftLogo: p?.leftLogo || p?.customLogo || undefined,
    centerLogo: p?.centerLogo || undefined,
    rightLogo: p?.rightLogo || undefined,
    customLogo: p?.customLogo || undefined,
    headerConfig: typeof p?.headerConfig === "object" && p?.headerConfig !== null ? p.headerConfig : {},
  }));

  return {
    ...defaultDocumentHeaderConfig,
    ...(input || {}),
    levelProfiles: safeProfiles,
  };
}

function normalizeLevel(val: string): string {
  return String(val || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export type CanonicalLevel = "Maternelle" | "Primaire" | "College" | "Lycée" | "University" | "Autre";

const LEVEL_GROUPS: Record<string, string[]> = {
  maternelle: ["maternelle", "creche", "prescolaire", "petite", "moyenne", "grande", "garderie"],
  primaire: ["primaire", "elementaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2", "sil"],
  college: ["college", "moyen", "cem", "6eme", "5eme", "4eme", "3eme", "6e", "5e", "4e", "3e", "brevet", "bepc", "premier cycle"],
  lycee: ["lycee", "secondaire", "2nde", "seconde", "1ere", "premiere", "tle", "terminale", "bac", "scientifique", "litteraire", "technique", "second cycle"],
  university: ["university", "universite", "superieur", "licence", "master", "doctorat", "lmd", "l1", "l2", "l3", "m1", "m2", "faculte", "institut", "bts", "dut"],
};

/**
 * Robustly infers canonical educational level from any combination of
 * student educationalLevel, class name, and section name.
 */
export function inferEducationalLevel(hints?: string | {
  educationalLevel?: string | null;
  className?: string | null;
  sectionName?: string | null;
  defaultLevel?: string;
}): CanonicalLevel {
  const hintsObj = typeof hints === "string"
    ? { educationalLevel: hints, className: hints }
    : hints;
  const normLvl = normalizeLevel(hintsObj?.educationalLevel || "");
  const normCls = normalizeLevel(hintsObj?.className || "");
  const normSec = normalizeLevel(hintsObj?.sectionName || "");
  const fullText = `${normLvl} ${normCls} ${normSec}`.trim();

  // 1. University / Supérieur / LMD check
  if (
    /\b(l[1-3]|m[1-2]|d[1-3]|licence|master|doctorat|bts|dut|deug|faculte|institut|superieur|universite|lmd)\b/i.test(fullText) ||
    normLvl.includes("universit") || normLvl.includes("superieur") || normLvl.includes("licence") || normLvl.includes("master") || normLvl.includes("doctorat")
  ) {
    return "University";
  }

  // 2. Collège (Middle school: 6ème, 5ème, 4ème, 3ème, BEPC, etc.)
  if (
    /\b(6[eè]me?|5[eè]me?|4[eè]me?|3[eè]me?|6e|5e|4e|3e|college|coll[eè]ge|bepc|brevet|cem|moyen)\b/i.test(normCls) ||
    /\b(6[eè]me?|5[eè]me?|4[eè]me?|3[eè]me?|6e|5e|4e|3e|college|coll[eè]ge|bepc|brevet|cem|moyen)\b/i.test(normSec) ||
    normLvl.includes("coll") || normLvl.includes("moyen") || normLvl.includes("cem")
  ) {
    return "College";
  }

  // 3. Lycée (High school: 2nde, 1ère, Terminale, BAC, etc.)
  if (
    /\b(2nde?|seconde|1[eè]re?|premiere|premi[eè]re|tle|terminale|lycee|lyc[eè]e|bac)\b/i.test(normCls) ||
    /\b(2nde?|seconde|1[eè]re?|premiere|premi[eè]re|tle|terminale|lycee|lyc[eè]e|bac)\b/i.test(normSec) ||
    normLvl.includes("lyc") || normLvl.includes("secondaire")
  ) {
    return "Lycée";
  }

  // 4. Primaire (Elementary: CI, CP, CE1, CE2, CM1, CM2, SIL)
  if (
    /\b(ci|cp|cp1|cp2|ce1|ce2|cm1|cm2|sil|cours\s+d'initiation|cours\s+preparatoire|cours\s+elementaire|cours\s+moyen)\b/i.test(normCls) ||
    /\b(ci|cp|ce1|ce2|cm1|cm2)[a-z0-9]?\b/i.test(normCls) ||
    /\b(ci|cp|cp1|cp2|ce1|ce2|cm1|cm2|sil)\b/i.test(normSec) ||
    normLvl.includes("prim") || normLvl.includes("elem")
  ) {
    return "Primaire";
  }

  // 5. Maternelle / Preschool
  if (
    /\b(maternelle|creche|prescolaire|garderie|petite\s+section|moyenne\s+section|grande\s+section|ps|ms|gs)\b/i.test(fullText) ||
    normLvl.includes("mat") || normLvl.includes("creche")
  ) {
    return "Maternelle";
  }

  // Fallback check on educationalLevel if provided
  if (normLvl) {
    if (normLvl.includes("coll")) return "College";
    if (normLvl.includes("lyc") || normLvl.includes("sec")) return "Lycée";
    if (normLvl.includes("prim")) return "Primaire";
    if (normLvl.includes("univ")) return "University";
  }

  const defaultVal = hintsObj?.defaultLevel || "Lycée";
  return (defaultVal === "Collège" ? "College" : defaultVal) as CanonicalLevel;
}

export function isHigherEducationLevel(levelOrClass?: string | null): boolean {
  if (!levelOrClass) return false;
  const inferred = inferEducationalLevel({
    educationalLevel: levelOrClass,
    className: levelOrClass,
  });
  return inferred === "University";
}

export function isPrimaryEducationLevel(levelOrClass?: string | null): boolean {
  if (!levelOrClass) return false;
  const inferred = inferEducationalLevel({
    educationalLevel: levelOrClass,
    className: levelOrClass,
  });
  return inferred === "Primaire" || inferred === "Maternelle";
}

export function isLevelMatching(candidateLevel: string, targetLevel: string): boolean {
  const normCandidate = normalizeLevel(candidateLevel);
  const normTarget = normalizeLevel(targetLevel);

  if (!normCandidate || !normTarget) return false;
  if (normCandidate === normTarget) return true;
  if (normCandidate === "tous" || normTarget === "tous") return true;

  // Infer canonical levels and compare
  const canCandidate = inferEducationalLevel({ educationalLevel: candidateLevel, className: candidateLevel });
  const canTarget = inferEducationalLevel({ educationalLevel: targetLevel, className: targetLevel });
  if (canCandidate === canTarget && canCandidate !== "Lycée") {
    return true;
  }
  if (canCandidate === canTarget && (normCandidate.includes("lyc") || normTarget.includes("lyc"))) {
    return true;
  }

  if (normCandidate.includes(normTarget) || normTarget.includes(normCandidate)) return true;

  // Check group aliases
  for (const [, aliases] of Object.entries(LEVEL_GROUPS)) {
    const candidateInGroup = aliases.some((a) => normCandidate.includes(a) || a.includes(normCandidate));
    const targetInGroup = aliases.some((a) => normTarget.includes(a) || a.includes(normTarget));
    if (candidateInGroup && targetInGroup) return true;
  }

  return false;
}

/**
 * Resolves the specific header config for a given campus/branch and educational level.
 * Order of priority:
 * 1. Profile matching both branchId AND educational level
 * 2. Profile matching educational level across all profiles
 * 3. Profile matching branchId specifically (as long as it doesn't conflict with targetLevel)
 * 4. Global base config
 */
export function getActiveLevelHeaderConfig(
  baseConfig: DocumentHeaderConfig,
  targetLevel?: string | null,
  targetBranchId?: number | string | null
): DocumentHeaderConfig {
  const safeBase = mergeDocumentHeaderConfig(baseConfig);
  const numBranchId = targetBranchId !== undefined && targetBranchId !== null && targetBranchId !== "all" && !isNaN(Number(targetBranchId))
    ? Number(targetBranchId)
    : null;

  if (!safeBase.levelProfiles || safeBase.levelProfiles.length === 0) {
    return safeBase;
  }

  // 1. Check profile matching BOTH branch and level
  let matchedProfile = safeBase.levelProfiles.find((profile) => {
    if (!numBranchId || !profile.branchId || Number(profile.branchId) !== numBranchId) {
      return false;
    }
    if (targetLevel && Array.isArray(profile.applicableLevels) && profile.applicableLevels.length > 0) {
      return profile.applicableLevels.some((lvl) => isLevelMatching(String(lvl), targetLevel));
    }
    return true;
  });

  // 2. If targetLevel is provided, match by educational level across all profiles FIRST!
  // This prevents an incorrect branchId fallback from imposing a University profile on a Collège student.
  if (!matchedProfile && targetLevel) {
    matchedProfile = safeBase.levelProfiles.find((profile) => {
      if (Array.isArray(profile.applicableLevels) && profile.applicableLevels.length > 0) {
        const hasMatch = profile.applicableLevels.some((lvl) => isLevelMatching(String(lvl), targetLevel));
        if (hasMatch) return true;
      }
      if (profile.name && isLevelMatching(profile.name, targetLevel)) {
        return true;
      }
      return false;
    });
  }

  // 3. Fallback: match by branchId specifically, but ONLY if not in conflict with targetLevel!
  if (!matchedProfile && numBranchId) {
    matchedProfile = safeBase.levelProfiles.find((profile) => {
      if (!profile.branchId || Number(profile.branchId) !== numBranchId) return false;
      if (targetLevel) {
        const isTargetHigher = isHigherEducationLevel(targetLevel);
        const isProfileHigher = profile.applicableLevels?.some((lvl) => isHigherEducationLevel(String(lvl))) ||
                                profile.name?.toLowerCase().includes("univ");
        if (isTargetHigher !== isProfileHigher) {
          return false; // Conflicting educational stage!
        }
      }
      return true;
    });
  }

  if (!matchedProfile || !matchedProfile.headerConfig) {
    return safeBase;
  }

  const overrides = matchedProfile.headerConfig;

  // Resolve sensible schoolName from profile if override doesn't specify one
  const resolvedSchoolName = overrides.schoolName || matchedProfile.branchName || matchedProfile.name.replace(/^En-tête\s+/i, "").replace(/\s*\(.*\)$/, "") || safeBase.schoolName;

  // For K-12, ensure service does not display University "Faculté"
  let resolvedService = overrides.service !== undefined ? overrides.service : safeBase.service;
  const isTargetK12 = targetLevel ? !isHigherEducationLevel(targetLevel) : false;
  if (isTargetK12 && resolvedService && (resolvedService.toLowerCase().includes("facult") || resolvedService.toLowerCase().includes("lmd"))) {
    resolvedService = "Service de la Scolarité";
  }

  // Ensure style is compatible
  let resolvedStyle = overrides.style || safeBase.style;
  if (isTargetK12 && resolvedStyle === "university_formal") {
    resolvedStyle = "classic_dual_logo";
  }

  return {
    ...safeBase,
    ...overrides,
    schoolName: resolvedSchoolName,
    service: resolvedService,
    style: resolvedStyle,
    leftLogo: matchedProfile.leftLogo || matchedProfile.customLogo || overrides.leftLogo || safeBase.leftLogo,
    centerLogo: matchedProfile.centerLogo || overrides.centerLogo || safeBase.centerLogo,
    rightLogo: matchedProfile.rightLogo || overrides.rightLogo || safeBase.rightLogo,
    levelProfiles: safeBase.levelProfiles,
    activeLevelProfileId: matchedProfile.id,
  };
}
