import { db } from "@/infrastructure/database";
import { rolePermissions, users, roles } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { classSubjects, schoolClasses } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { students } from "@/infrastructure/database/schema/students";
import { eq, sql, or, and } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";

export type PermissionAction = "canView" | "canEdit" | "canDelete";

export type UserRoleType = 
  | "super_admin" 
  | "general_director"
  | "level_director"
  | "level_comptable"    // Comptable assigned to a specific level
  | "level_caissier"    // Caissier assigned to a specific level
  | "teacher"
  | "ministere"
  | "dren"
  | "dden"
  | "inspection"
  | "directeur"
  | "censeur"
  | "surveillant"
  | "comptable"
  | "caissier"
  | "enseignant"
  | "eleve"
  | "parent"
  | "consultation"
  | "regular_user";

const GLOBAL_LEVEL_TERMS = [
  "tous",
  "all",
  "tous les niveaux",
  "toutes les etapes",
  "tous les cycles",
  "administration generale",
  "administration générale",
  "administration",
  "administration_generale",
  "gestion scolaire",
  "gestion_scolaire",
  "الكل",
  "كل",
  "جميع",
  "جميع المستويات",
  "الإدارة العامة",
  "ادارة عامة",
  "الإدارة",
  "ادارة"
];

const PRIMARY_LEVEL_TERMS = [
  "primaire",
  "maternelle",
  "elementaire",
  "\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
  "\u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
  "\u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0647",
];

const MIDDLE_LEVEL_TERMS = [
  "college",
  "moyen",
  "middle",
  "cem",
  "college general",
  "college_general",
  "premier cycle",
  "premier_cycle",
  "\u0627\u0639\u062f\u0627\u062f\u064a",
  "\u0627\u0639\u062f\u0627\u062f\u064a\u0647",
  "\u0627\u0644\u0627\u0639\u062f\u0627\u062f\u064a",
  "\u0627\u0644\u0627\u0639\u062f\u0627\u062f\u064a\u0647",
  "\u0645\u062a\u0648\u0633\u0637",
  "\u0627\u0644\u0645\u062a\u0648\u0633\u0637",
  "\u0645\u062a\u0648\u0633\u0637\u0647",
  "\u0627\u0644\u0645\u062a\u0648\u0633\u0637\u0647",
];

const SECONDARY_LEVEL_TERMS = [
  "lycee",
  "secondaire",
  "high school",
  "second cycle",
  "second_cycle",
  "\u062b\u0627\u0646\u0648\u064a",
  "\u062b\u0627\u0646\u0648\u064a\u0647",
  "\u0627\u0644\u062b\u0627\u0646\u0648\u064a",
  "\u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0647",
];

const UNIVERSITY_LEVEL_TERMS = [
  "university",
  "universite",
  "université",
  "universitaire",
  "licence",
  "licence (lmd)",
  "licence lmd",
  "lmd",
  "master",
  "doctorat",
  "superieur",
  "superieure",
  "enseignement superieur",
  "enseignement supérieur",
  "enseignement_superieur",
  "جامعة",
  "الجامعة",
  "جامعي",
  "عالي",
  "تعليم عالي",
  "التعليم العالي",
];

export type EducationalLevelFamily = "primary" | "middle" | "secondary" | "university";

export function getEducationalLevelFamily(level: string | null | undefined): EducationalLevelFamily | null {
  const norm = normalizeLevel(level || "");
  if (!norm || GLOBAL_LEVEL_TERMS.includes(norm)) return null;

  if (
    UNIVERSITY_LEVEL_TERMS.includes(norm) ||
    norm.includes("universit") ||
    norm.includes("superieur") ||
    norm.includes("licence") ||
    norm.includes("master") ||
    norm.includes("doctorat") ||
    norm.includes("جامع") ||
    norm.includes("التعليم العالي")
  ) {
    return "university";
  }

  if (
    MIDDLE_LEVEL_TERMS.includes(norm) ||
    norm.includes("coll") ||
    norm.includes("moyen") ||
    norm.includes("cem") ||
    norm.includes("اعداد") ||
    norm.includes("متوسط")
  ) {
    return "middle";
  }

  if (
    SECONDARY_LEVEL_TERMS.includes(norm) ||
    norm.includes("lyc") ||
    norm.includes("secondaire") ||
    norm.includes("ثانوي")
  ) {
    return "secondary";
  }

  if (
    PRIMARY_LEVEL_TERMS.includes(norm) ||
    norm.includes("prim") ||
    norm.includes("elem") ||
    norm.includes("mat") ||
    norm.includes("creche") ||
    norm.includes("ابتدائ")
  ) {
    return "primary";
  }

  return null;
}

// Classify user role type
export const getUserRoleType = cache(async (user: any): Promise<UserRoleType> => {
  if (!user) return "regular_user";
  if (user.superAdmin === true || user.superAdmin === 1) return "super_admin";
  
  if (user.studentId || user.student_id) return "eleve";
  
  let roleName = user.role?.roleName;
  if (!roleName && user.roleId) {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, user.roleId) });
    roleName = r?.roleName;
  }
  
  const norm = (roleName || "").toLowerCase().trim();
  if (norm.includes("super_admin") || norm.includes("super admin")) return "super_admin";
  if (norm.includes("ministere") || norm.includes("ministère")) return "ministere";
  if (norm.includes("dren")) return "dren";
  if (norm.includes("dden")) return "dden";
  if (norm.includes("inspection")) return "inspection";
  const hasRestrictedLevel = !hasAllEducationalLevels(user.educationalLevel);
  if (norm.includes("directeur") || norm.includes("dirigeant") || norm.includes("\u0645\u062f\u064a\u0631")) {
    if (hasRestrictedLevel) {
      return "level_director";
    }
    return "directeur";
  }
  if (norm.includes("censeur")) return "censeur";
  if (norm.includes("surveillant")) return "surveillant";
  if (norm.includes("comptable")) {
    // Comptable with a specific level (not Tous) → level-scoped: sees only finance for their level
    if (hasRestrictedLevel) return "level_comptable";
    return "comptable";
  }
  if (norm.includes("caissier")) {
    // Caissier with a specific level (not Tous) → level-scoped: sees only finance for their level
    if (hasRestrictedLevel) return "level_caissier";
    return "caissier";
  }
  if (norm.includes("enseignant") || norm.includes("professeur") || norm.includes("teacher")) return "teacher";
  if (norm.includes("eleve") || norm.includes("etudiant") || norm.includes("student")) return "eleve";
  if (norm.includes("parent") || norm.includes("tuteur")) return "parent";
  if (norm.includes("consultation") || norm.includes("viewer")) return "consultation";

  if (user.employeeId || user.employee_id) return "teacher";

  // Legacy compatibility check
  const isAdmin = user.admin === true;

  if (isAdmin) {
    if (hasRestrictedLevel) {
      return "level_director";
    }
    return "general_director";
  }
  
  return "regular_user";
});

// Check if user has module-level permission
export const hasPermission = cache(async (
  userId: number,
  moduleName: string,
  action: PermissionAction,
  subFeatureName?: string
): Promise<boolean> => {
  const user = await getCurrentUser();
  if (user && (user.admin || user.superAdmin)) return true;

  if (userId === 0 || !userId) {
    if (user?.admin || user?.superAdmin) return true;
  }

  const userBase = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true }
  });

  if (!userBase) {
    if (user?.admin || user?.superAdmin) return true;
    return true;
  }

  if (userBase.admin || userBase.superAdmin) return true;

  const roleType = await getUserRoleType(userBase);
  const modLower = moduleName.toLowerCase().trim();

  // 1. Super Admin: full access to everything
  if (roleType === "super_admin") return true;

  // 2. Ministère: full view/edit/delete access for all modules (national scope)
  if (roleType === "ministere") return true;

  // 3. DREN (Regional): sees all except security. Can only edit canevas & reports.
  if (roleType === "dren") {
    if (modLower === "security") return false;
    if (action === "canView") return true;
    return ["canevas", "reports"].includes(modLower);
  }

  // 4. DDEN (Departmental): same as DREN
  if (roleType === "dden") {
    if (modLower === "security") return false;
    if (action === "canView") return true;
    return ["canevas", "reports"].includes(modLower);
  }

  // 5. Inspection: sees all in its schools except finance and security. Can only edit canevas/reports.
  if (roleType === "inspection") {
    if (["finance", "security"].includes(modLower)) return false;
    if (action === "canView") return true;
    return ["canevas", "reports"].includes(modLower);
  }

  // 6. Directeur / General Director / Level Director: full access to school modules including Security/Users
  if (roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return true;
  }

  // 7. Enseignants / Teachers: full view and edit for academic modules
  if (roleType === "teacher" || roleType === "enseignant") {
    const teacherModules = [
      "academics",
      "grades",
      "exams",
      "attendance",
      "assiduite",
      "students",
      "classes",
      "devoirs",
      "pedagogie",
      "timetable",
      "schedule",
      "bulletin",
      "bulletins",
      "discipline",
      "messaging",
      "announcements",
    ];
    if (teacherModules.includes(modLower)) {
      if (action === "canView" || action === "canEdit") return true;
    }
  }

  // 8. Censeur / Surveillant: full view and edit for pedagogical and disciplinary modules
  if (roleType === "censeur" || roleType === "surveillant") {
    const academicAdminModules = [
      "academics",
      "grades",
      "exams",
      "attendance",
      "assiduite",
      "students",
      "classes",
      "discipline",
      "pedagogie",
      "bulletin",
      "bulletins",
      "settings",
      "messaging",
      "announcements",
      "hostel",
      "internat",
    ];
    if (academicAdminModules.includes(modLower)) {
      if (action === "canView" || action === "canEdit") return true;
    }
  }

  // 9. Comptable / Caissier: full view and edit for financial modules
  if (
    roleType === "comptable" ||
    roleType === "caissier" ||
    roleType === "level_comptable" ||
    roleType === "level_caissier"
  ) {
    const financeModules = [
      "finance",
      "canteen",
      "transport",
      "students",
      "reports",
      "academics",
    ];
    if (financeModules.includes(modLower)) {
      if (action === "canView") return true;
      if (action === "canEdit" && modLower !== "academics") return true;
    }
  }

  // 10. Élève & Parent: always have canView permission for personal student modules
  if (roleType === "eleve" || roleType === "parent") {
    if (action === "canView") {
      const allowedStudentModules = [
        "attendance",
        "assiduite",
        "academics",
        "students",
        "classes",
        "grades",
        "exams",
        "bulletin",
        "bulletins",
        "finance",
        "schedule",
        "timetable",
        "messaging",
        "announcements",
      ];
      if (allowedStudentModules.includes(modLower)) return true;
    }
  }

  // 11. General baseline canView for basic metadata in school
  if (action === "canView" && ["academics", "settings", "classes", "students"].includes(modLower)) {
    return true;
  }

  // Fallback to database-configured role permissions
  const userWithPerms = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      role: {
        with: {
          permissions: {
            where: sql`LOWER(${rolePermissions.moduleName}) = LOWER(${moduleName})`,
          },
        },
      },
    },
  });

  if (!userWithPerms?.role?.permissions || userWithPerms.role.permissions.length === 0) {
    return false;
  }

  const permission = userWithPerms.role.permissions[0];

  if (subFeatureName && permission.fieldPermissions) {
    try {
      const fieldPerms = typeof permission.fieldPermissions === 'string'
        ? JSON.parse(permission.fieldPermissions)
        : permission.fieldPermissions;
      const subConfig = fieldPerms[subFeatureName];
      if (subConfig) {
        if (action === "canView" && subConfig.view !== undefined) return subConfig.view;
        if (action === "canEdit" && subConfig.edit !== undefined) return subConfig.edit;
      }
    } catch (_) {}
  }

  return permission[action] ?? false;
});

// ─── HIERARCHICAL ACCESS CONTROL CHECKS (RECORD-LEVEL) ───

function normalizeScopeValue(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function scopeEquals(userValue: string | null | undefined, resourceValue: string | null | undefined): boolean {
  const resource = normalizeScopeValue(resourceValue);
  if (!resource) return true;
  const userScope = normalizeScopeValue(userValue);
  return Boolean(userScope) && userScope === resource;
}

type ScopedUser = {
  region?: string | null;
  departement?: string | null;
  department?: string | null;
  inspection?: string | null;
  emplacement?: string | null;
};

function getUserScopeValue(user: ScopedUser, keys: Array<keyof ScopedUser>): string {
  for (const key of keys) {
    const value = user?.[key];
    if (normalizeScopeValue(value)) return String(value);
  }
  return "";
}

export async function verifyRegionAccess(user: any, regionName: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  return scopeEquals(getUserScopeValue(user, ["region", "emplacement"]), regionName);
}

export async function verifyDepartmentAccess(user: any, region: string | null | undefined, department: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  // Check region scope first
  if (!await verifyRegionAccess(user, region)) return false;
  if (roleType === "dren") return true; // DREN sees everything in region

  return scopeEquals(getUserScopeValue(user, ["departement", "department", "emplacement"]), department);
}

export async function verifyInspectionAccess(user: any, region: string | null | undefined, department: string | null | undefined, inspection: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  // Check department scope first
  if (!await verifyDepartmentAccess(user, region, department)) return false;
  if (roleType === "dren" || roleType === "dden") return true; // DREN/DDEN sees everything in department

  return scopeEquals(getUserScopeValue(user, ["inspection", "emplacement"]), inspection);
}

export async function verifySchoolAccess(user: any, schoolId: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  if (!schoolId) return true;

  if (roleType === "dren" || roleType === "dden" || roleType === "inspection") {
    const numericSchoolId = Number(schoolId);
    if (!Number.isInteger(numericSchoolId)) return false;

    const branch = await db.query.schoolBranches.findFirst({
      where: eq(schoolBranches.schoolId, numericSchoolId),
      orderBy: [schoolBranches.createdAt],
    });

    if (!branch) return false;

    const region = branch.region || branch.dren;
    const department = branch.department || branch.dden;

    if (roleType === "dren") {
      return await verifyRegionAccess(user, region);
    }

    if (roleType === "dden") {
      return await verifyDepartmentAccess(user, region, department);
    }

    return await verifyInspectionAccess(user, region, department, branch.inspection);
  }

  return String(user.schoolId) === String(schoolId);
}

export async function verifyStudentAccess(user: any, studentId: string | number): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere" || roleType === "dren" || roleType === "dden" || roleType === "inspection") return true;

  if (roleType === "directeur" || roleType === "censeur" || roleType === "surveillant" ||
      roleType === "comptable" || roleType === "caissier" ||
      roleType === "level_comptable" || roleType === "level_caissier") {
    return true; // Subject to schoolId and level matching in database query
  }

  if (roleType === "eleve") {
    return String(user.studentId || user.id) === String(studentId);
  }

  if (roleType === "parent") {
    if (!user.studentId || String(user.studentId) !== String(studentId)) {
      return false;
    }

    if (!user.schoolId) {
      return true;
    }

    const child = await db.query.students.findFirst({
      where: and(
        eq(students.id, Number(studentId)),
        eq(students.schoolId, user.schoolId)
      ),
      columns: { id: true },
    });

    return Boolean(child);
  }

  return false;
}

export async function verifyClassAccess(user: any, classId: number): Promise<boolean> {
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere" || roleType === "dren" || roleType === "dden" || roleType === "inspection" || roleType === "directeur" || roleType === "censeur") {
    return true;
  }
  
  if (roleType === "teacher" || roleType === "enseignant") {
    const emp = await getTeacherEmployee(user);
    if (!emp) return false;
    const classIds = await getTeacherClassIds(emp.id);
    return classIds.includes(classId);
  }
  
  return false;
}

export async function hasFieldPermission(
  userId: number,
  moduleName: string,
  fieldName: string,
  action: "view" | "edit"
): Promise<boolean> {
  const userBase = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true }
  });

  if (!userBase) return false;

  const roleType = await getUserRoleType(userBase);
  if (roleType === "super_admin" || roleType === "directeur" || roleType === "ministere") return true;

  const userWithPerms = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      role: {
        with: {
          permissions: {
            where: sql`LOWER(${rolePermissions.moduleName}) = LOWER(${moduleName})`,
          },
        },
      },
    },
  });

  const permission = userWithPerms?.role?.permissions?.[0];
  if (!permission?.fieldPermissions) return true; // Default to true if no field constraints defined

  try {
    const fields = JSON.parse(permission.fieldPermissions);
    if (fields[fieldName]) {
      return fields[fieldName][action] ?? true;
    }
  } catch (e) {
    console.error("Error parsing field permissions:", e);
  }

  return true;
}

export async function isAdmin(userId: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { admin: true, superAdmin: true },
  });
  return !!(user?.admin || user?.superAdmin);
}

export function normalizeLevel(level: string): string {
  return String(level || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseEducationalLevels(level: string | null | undefined): string[] {
  if (!level) return [];
  return level.split(",").map((item) => item.trim()).filter(Boolean);
}

export function hasAllEducationalLevels(level: string | null | undefined): boolean {
  const levels = parseEducationalLevels(level);
  return levels.length === 0 || levels.some((item) => {
    const norm = normalizeLevel(item);
    return GLOBAL_LEVEL_TERMS.includes(norm);
  });
}

export function getCompatibleLevels(level: string): string[] {
  if (hasAllEducationalLevels(level)) {
    return [
      "Primaire", "Maternelle", "Elémentaire", "elementaire", "primaire", "maternelle",
      "Collège", "College", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle",
      "Lycée", "Lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle",
      "Université", "Universite", "Universitaire", "Licence", "Licence (LMD)", "LMD", "Master", "Doctorat", "Supérieur", "Enseignement Supérieur",
      "Administration Générale", "Administration generale", "Administration", "Tous", "All", "tous", "all", ""
    ];
  }

  const selectedLevels = parseEducationalLevels(level);
  if (selectedLevels.length > 1) {
    return Array.from(new Set(selectedLevels.flatMap((item) => getCompatibleLevels(item))));
  }

  const family = getEducationalLevelFamily(level);
  if (family === "primary") {
    return Array.from(new Set(["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire", "ابتدائي", "الابتدائي", "Tous", "All", "tous", "all", ""]));
  }
  if (family === "middle") {
    return Array.from(new Set(["Collège", "College", "collège", "college", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle", "إعدادي", "الإعدادية", "اعدادي", "متوسط", "المتوسط", "Tous", "All", "tous", "all", ""]));
  }
  if (family === "secondary") {
    return Array.from(new Set(["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle", "ثانوي", "الثانوية", "Tous", "All", "tous", "all", ""]));
  }
  if (family === "university") {
    return Array.from(new Set([
      "Université", "Universite", "université", "universite",
      "Universitaire", "universitaire",
      "Licence", "licence", "Licence (LMD)", "Licence LMD", "LMD", "lmd",
      "Master", "master",
      "Doctorat", "doctorat",
      "Supérieur", "superieur", "Enseignement Supérieur", "enseignement superieur", "Enseignement supérieur", "enseignement_superieur",
      "جامعة", "الجامعة", "جامعي", "عالي", "التعليم العالي",
      "Tous", "All", "tous", "all", ""
    ]));
  }

  const norm = normalizeLevel(level);
  let baseLevels: string[] = [];
  
  if (norm === "primaire" || norm === "maternelle" || norm === "elementaire") {
    baseLevels = ["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire"];
  } else if (norm === "college" || norm === "moyen" || norm === "college general" || norm === "premier cycle") {
    baseLevels = ["Collège", "College", "collège", "college", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle"];
  } else if (norm === "lycee" || norm === "secondaire" || norm === "second cycle") {
    baseLevels = ["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle"];
  } else if (["university", "universite", "universitaire", "licence", "master", "doctorat", "superieur", "enseignement superieur", "lmd"].includes(norm)) {
    baseLevels = [
      "Université", "Universite", "université", "universite",
      "Universitaire", "universitaire",
      "Licence", "licence", "Licence (LMD)", "Licence LMD", "LMD", "lmd",
      "Master", "master",
      "Doctorat", "doctorat",
      "Supérieur", "superieur", "Enseignement Supérieur", "enseignement superieur", "Enseignement supérieur",
      "جامعة", "الجامعة", "جامعي", "عالي", "التعليم العالي"
    ];
  } else {
    baseLevels = [level, level.toLowerCase(), level.toUpperCase(), level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()];
  }

  // Always include global levels to make sure global staff/resources are visible
  return [...baseLevels, "Tous", "All", "tous", "all", ""];
}

export async function getActiveEducationalLevel(user: any): Promise<string | null> {
  if (!user) return null;
  
  const roleType = await getUserRoleType(user);
  const isAdminUser = roleType === "super_admin" || roleType === "directeur" || roleType === "general_director" || roleType === "level_director" || roleType === "ministere";
  
  if (!isAdminUser) {
    if (hasAllEducationalLevels(user.educationalLevel)) return null;
    return user.educationalLevel || "Primaire";
  }
  
  // Admin/Manager: check selected branch cookie
  try {
    const cookieStore = await cookies();
    const selectedBranchId = cookieStore.get("selected_branch_id")?.value;
    if (selectedBranchId && selectedBranchId !== "all" && !isNaN(parseInt(selectedBranchId))) {
      const branch = await db.query.schoolBranches.findFirst({
        where: eq(schoolBranches.id, parseInt(selectedBranchId))
      });
      if (branch?.instType && !hasAllEducationalLevels(branch.instType)) {
        return branch.instType;
      }
    }
  } catch (e) {
    // cookies() can throw in some contexts (e.g. static generation)
  }

  // If user is admin or educationalLevel is global ("Administration Générale", "Tous", etc.), return null (all levels)
  if (roleType === "super_admin" || roleType === "directeur" || roleType === "general_director" || roleType === "ministere" || user.admin || hasAllEducationalLevels(user.educationalLevel)) {
    if (user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel)) {
      return user.educationalLevel;
    }
    return null;
  }

  if (hasAllEducationalLevels(user.educationalLevel)) {
    return null;
  }
  
  return user.educationalLevel || "Primaire";
}

export function checkEducationalLevelAccess(user: any, resourceLevel: string | null | undefined): boolean {
  if (!user) return false;
  if (user.superAdmin) return true;
  
  const hasRestrictedLevel = !hasAllEducationalLevels(user.educationalLevel);
  
  if (user.admin === true && !hasRestrictedLevel) {
    return true;
  }
  
  if (!resourceLevel) return true;
  
  const normResource = normalizeLevel(resourceLevel);
  
  if (GLOBAL_LEVEL_TERMS.includes(normResource) || normResource === "") return true;
  const userLevels = parseEducationalLevels(user.educationalLevel);
  if (userLevels.some((level) => normalizeLevel(level) === normResource)) return true;

  const resourceFamily = getEducationalLevelFamily(resourceLevel);
  if (resourceFamily && userLevels.some((level) => getEducationalLevelFamily(level) === resourceFamily)) {
    return true;
  }
  
  const universityTerms = ["university", "universite", "licence", "master", "doctorat", "superieur"];
  const primaryTerms = ["primaire", "maternelle", "elementaire"];
  const middleTerms = ["college", "moyen"];
  const secondaryTerms = ["lycee", "secondaire"];
  return userLevels.some((level) => {
    const normUser = normalizeLevel(level);
    if (universityTerms.includes(normUser) && universityTerms.includes(normResource)) return true;
    if (primaryTerms.includes(normUser) && primaryTerms.includes(normResource)) return true;
    if (middleTerms.includes(normUser) && middleTerms.includes(normResource)) return true;
    if (secondaryTerms.includes(normUser) && secondaryTerms.includes(normResource)) return true;
    return false;
  });
}

/**
 * Robust check if a student or class belongs to the given active educational level.
 * Checks student.educationalLevel, student.classe, filiere, and sectionName.
 */
export function isStudentInEducationalLevel(
  student: {
    educationalLevel?: string | null;
    classe?: string | null;
    sectionName?: string | null;
    filiere?: string | null;
  } | null | undefined,
  activeLevel: string | null | undefined
): boolean {
  if (!activeLevel || hasAllEducationalLevels(activeLevel)) return true;
  if (!student) return false;

  const parts = parseEducationalLevels(activeLevel);
  if (parts.length > 1) {
    return parts.some((p) => isStudentInEducationalLevel(student, p));
  }

  const targetFamily = getEducationalLevelFamily(activeLevel);
  if (!targetFamily) return true;

  // 1. Direct match on student.educationalLevel if present and specific
  if (student.educationalLevel && !hasAllEducationalLevels(student.educationalLevel)) {
    const studentParts = parseEducationalLevels(student.educationalLevel);
    for (const sp of studentParts) {
      const studentFamily = getEducationalLevelFamily(sp);
      if (studentFamily && studentFamily === targetFamily) {
        return true;
      }
    }
  }

  // 2. Class name / filiere / section inspection
  const classText = `${student.classe || ""} ${student.filiere || ""} ${student.sectionName || ""}`.trim();
  if (classText) {
    const normText = normalizeLevel(classText);

    // University patterns: L1, L2, L3, M1, M2, D1-D3, Licence, Master, Doctorat, BTS, DUT, etc.
    const isUnivClass = /\b(l[1-3]|m[1-2]|d[1-3]|licence|master|doctorat|bts|dut|deug|faculte|institut|superieur|universite|lmd)\b/i.test(normText) ||
      normText.includes("universit") || normText.includes("superieur") || normText.includes("licence") || normText.includes("master") || normText.includes("doctorat");

    // Middle school / Collège patterns: 6ème, 5ème, 4ème, 3ème, etc.
    const isCollegeClass = /\b(6[eè]me?|5[eè]me?|4[eè]me?|3[eè]me?|6e|5e|4e|3e|college|coll[eè]ge|bepc|brevet|cem|moyen)\b/i.test(normText) ||
      normText.includes("coll") || normText.includes("moyen") || normText.includes("cem");

    // High school / Lycée patterns: 2nde, 1ère, Terminale, etc.
    const isLyceeClass = /\b(2nde?|seconde|1[eè]re?|premiere|premi[eè]re|tle|terminale|lycee|lyc[eè]e|bac)\b/i.test(normText) ||
      normText.includes("lyc") || normText.includes("secondaire");

    // Primary / Elementary patterns: CI, CP, CE1, CE2, CM1, CM2, SIL (and CIA, CPB, etc.)
    const isPrimaryClass = /\b(ci|cp|cp1|cp2|ce1|ce2|cm1|cm2|sil|cours\s+d'initiation|cours\s+preparatoire|cours\s+elementaire|cours\s+moyen)\b/i.test(normText) ||
      /\b(ci|cp|ce1|ce2|cm1|cm2)[a-z0-9]?\b/i.test(normText) ||
      normText.includes("prim") || normText.includes("elem");

    // Preschool / Maternelle patterns
    const isMaternelleClass = /\b(maternelle|creche|prescolaire|garderie|petite\s+section|moyenne\s+section|grande\s+section|ps|ms|gs)\b/i.test(normText) ||
      normText.includes("mat") || normText.includes("creche");

    if (targetFamily === "university") {
      return isUnivClass && !isPrimaryClass && !isCollegeClass && !isLyceeClass;
    }
    if (targetFamily === "middle") {
      return isCollegeClass && !isUnivClass && !isPrimaryClass;
    }
    if (targetFamily === "secondary") {
      return isLyceeClass && !isUnivClass && !isCollegeClass;
    }
    if (targetFamily === "primary") {
      return (isPrimaryClass || isMaternelleClass) && !isUnivClass && !isCollegeClass && !isLyceeClass;
    }
  }

  return false;
}

// Get Teacher Employee record matching user's username or email
export const getTeacherEmployee = cache(async (user: any) => {
  if (!user) return null;
  
  let empId = user.employeeId;
  if (!empId && user.id) {
    const fresh = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { employeeId: true }
    });
    empId = fresh?.employeeId;
  }
  
  // 1. Prefer explicit employeeId link if present
  if (empId) {
    const emp = await db.query.employees.findFirst({
      where: eq(employees.id, Number(empId))
    });
    if (emp) return emp;
  }
  
  // 2. Fallback to username/email matching
  const username = user.utilisateur || "";
  const email = user.email || "";
  
  const emp = await db.query.employees.findFirst({
    where: or(
      eq(employees.email, username),
      eq(employees.email, email)
    )
  });
  return emp || null;
});

// Get all class IDs taught by a teacher
export const getTeacherClassIds = cache(async (employeeId: number): Promise<number[]> => {
  const subjects = await db.select({ classId: classSubjects.classId })
     .from(classSubjects)
     .where(eq(classSubjects.employeeId, employeeId));
  
  return subjects
    .map(s => s.classId)
    .filter((id): id is number => id !== null);
});

// Verify educational level access to a specific class
export async function verifyClassEducationalLevelAccess(user: any, classId: number): Promise<boolean> {
  if (!user) return false;
  if (user.superAdmin === true || user.superAdmin === 1) return true;
  const roleType = await getUserRoleType(user);
  if (roleType !== "level_director" && hasAllEducationalLevels(user.educationalLevel)) return true;

  try {
    const targetClass = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true }
    });
    if (!targetClass) return false;
    const level = targetClass.section?.educationalLevel;
    return checkEducationalLevelAccess(user, level);
  } catch (error) {
    console.error("[verifyClassEducationalLevelAccess] Error:", error);
    return false;
  }
}

// Verify teacher or level director access to a specific class
export async function verifyTeacherClassAccess(user: any, classId: number): Promise<boolean> {
  if (user?.superAdmin === true || user?.superAdmin === 1) return true;
  const roleType = await getUserRoleType(user);
  if (roleType === "eleve" || roleType === "parent") return false;

  // Level directors are strictly scoped to classes belonging to their educational level
  if (roleType === "level_director" || (!hasAllEducationalLevels(user?.educationalLevel) && (roleType === "directeur" || roleType === "general_director" || user?.admin === true))) {
    return await verifyClassEducationalLevelAccess(user, classId);
  }

  if (
    roleType === "directeur" ||
    roleType === "general_director" ||
    roleType === "censeur" ||
    roleType === "surveillant" ||
    roleType === "super_admin" ||
    roleType === "ministere" ||
    roleType === "dren" ||
    roleType === "dden" ||
    roleType === "inspection"
  ) {
    return true;
  }
  if (roleType === "teacher" || roleType === "enseignant") {
    const emp = await getTeacherEmployee(user);
    if (!emp) return false;
    const classIds = await getTeacherClassIds(emp.id);
    return classIds.includes(classId);
  }
  
  return true;
}

// Verify teacher or level director access to a specific class and subject
export async function verifyTeacherClassSubjectAccess(user: any, classId: number, subjectId: number): Promise<boolean> {
  if (user?.superAdmin === true || user?.superAdmin === 1) return true;
  const roleType = await getUserRoleType(user);
  if (roleType === "eleve" || roleType === "parent") return false;

  // Level directors are strictly scoped to classes belonging to their educational level
  if (roleType === "level_director" || (!hasAllEducationalLevels(user?.educationalLevel) && (roleType === "directeur" || roleType === "general_director" || user?.admin === true))) {
    return await verifyClassEducationalLevelAccess(user, classId);
  }

  if (
    roleType === "directeur" ||
    roleType === "general_director" ||
    roleType === "censeur" ||
    roleType === "surveillant" ||
    roleType === "super_admin" ||
    roleType === "ministere" ||
    roleType === "dren" ||
    roleType === "dden" ||
    roleType === "inspection"
  ) {
    return true;
  }
  if (roleType === "teacher" || roleType === "enseignant") {
    const emp = await getTeacherEmployee(user);
    if (!emp) return false;
    
    const assignment = await db.query.classSubjects.findFirst({
      where: and(
        eq(classSubjects.classId, classId),
        eq(classSubjects.subjectId, subjectId),
        eq(classSubjects.employeeId, emp.id)
      )
    });
    if (assignment) return true;

    const classIds = await getTeacherClassIds(emp.id);
    if (classIds.includes(classId)) return true;
    return false;
  }
  
  return true;
}

/**
 * Enforces educational level access at the routing/page level.
 * Redirects to dashboard if the user is unauthorized.
 */
export async function enforceLevelAccess(resourceLevel: string | null | undefined) {
  const { getCurrentUser } = await import("./session");
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  
  if (!checkEducationalLevelAccess(user, resourceLevel)) {
    redirect("/dashboard?error=unauthorized_level");
  }
}
