/**
 * ─── Pédagogie & Enseignement RBAC System ───────────────────────────────────
 * Establish domain-specific helper functions to control viewing, editing,
 * and management permissions based on the user's role and school context.
 */

export type PedagogieRole =
  | "super_admin"
  | "directeur"
  | "responsable_pedagogique"
  | "enseignant"
  | "eleve"
  | "parent"
  | "consultation"
  | "guest";

export interface PedagogieScope {
  role: PedagogieRole;
  schoolId: number | null;
  allSchools: boolean;
  allClasses: boolean;
  teacherId: number | null;
  studentId: number | null;
  isReadOnly: boolean;
}

/**
 * Resolves the Pedagogy-specific role for a given user.
 */
export function getPedagogieRole(user: any): PedagogieRole {
  if (!user) return "guest";
  if (user.superAdmin === true || user.superAdmin === 1) return "super_admin";

  const roleNameLower = (user.role?.roleName || "").toLowerCase();

  // 1. Directeur / School Admin
  if (user.admin === true || roleNameLower.includes("directeur") || roleNameLower.includes("dirigeant")) {
    return "directeur";
  }

  // 2. Responsable Pédagogique
  if (
    roleNameLower.includes("responsable pédagogique") ||
    roleNameLower.includes("inspecteur") ||
    roleNameLower.includes("censeur") ||
    roleNameLower.includes("études")
  ) {
    return "responsable_pedagogique";
  }

  // 3. Enseignant / Professeur
  if (
    roleNameLower.includes("professeur") ||
    roleNameLower.includes("enseignant") ||
    roleNameLower.includes("teacher")
  ) {
    return "enseignant";
  }

  // 4. Élève / Étudiant
  if (
    roleNameLower.includes("élève") ||
    roleNameLower.includes("etudiant") ||
    roleNameLower.includes("student")
  ) {
    return "eleve";
  }

  // 5. Parent / Tuteur
  if (
    roleNameLower.includes("parent") ||
    roleNameLower.includes("tuteur") ||
    roleNameLower.includes("famille")
  ) {
    return "parent";
  }

  // 6. Consultation/Guest
  if (
    roleNameLower.includes("consultation") ||
    roleNameLower.includes("lecteur") ||
    roleNameLower.includes("viewer")
  ) {
    return "consultation";
  }

  // Default fallback is Consultation for safety
  return "consultation";
}

/**
 * Gets the scope limitations (school, classes, teachers, read-only status)
 * for a user to query database elements.
 */
export function getPedagogieScope(user: any): PedagogieScope {
  const role = getPedagogieRole(user);

  return {
    role,
    schoolId: user?.schoolId || null,
    allSchools: role === "super_admin",
    allClasses: ["super_admin", "directeur", "responsable_pedagogique"].includes(role),
    teacherId: role === "enseignant" ? (user?.employeeId || user?.id || null) : null,
    studentId: role === "eleve" ? (user?.studentId || user?.id || null) : null,
    isReadOnly: ["eleve", "parent", "consultation", "guest"].includes(role),
  };
}

/**
 * Checks if the user has database-configured permissions for the Pedagogy module.
 */
function hasDbPedagogyPermission(user: any, action: "canView" | "canEdit" | "canDelete"): boolean {
  if (!user) return false;
  if (user.superAdmin === true || user.superAdmin === 1) return true;
  if (user.admin === true) return true;

  const perms = user.role?.permissions || [];
  const pedPerm = perms.find((p: any) => p.moduleName?.toLowerCase() === "pedagogy");
  if (pedPerm) {
    return pedPerm[action] ?? false;
  }
  return false;
}

/**
 * Check if the user is allowed to access the Pédagogie section.
 */
export function canViewPedagogie(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canView")) return true;
  const role = getPedagogieRole(user);
  return role !== "guest";
}

/**
 * Check if the user can create and modify logbooks (Cahier de textes).
 */
export function canManageCahierTextes(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can validate/approve logbooks.
 */
export function canValidateCahierTextes(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canDelete")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique"].includes(role);
}

/**
 * Check if the user can manage course planification.
 */
export function canManagePlanification(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  // Directeur and Responsable can manage all. Enseignant can also do edits for their classes.
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can manage pedagogical resources.
 */
export function canManageRessources(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can manage assignments (Devoirs).
 */
export function canManageDevoirs(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can correct/grade assignments.
 */
export function canCorrectDevoirs(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can manage remediation plans.
 */
export function canManageRemediation(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can manage/schedule class inspections.
 */
export function canManageInspection(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique"].includes(role);
}

/**
 * Check if the user can view pedagogical reports.
 */
export function canViewPedagogieReports(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canView")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user can export reports.
 */
export function canExportPedagogieReports(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canView")) return true;
  const role = getPedagogieRole(user);
  return ["super_admin", "directeur", "responsable_pedagogique", "enseignant"].includes(role);
}

/**
 * Check if the user has read-only access (no edits, no deletes).
 */
export function isReadOnlyPedagogie(user: any): boolean {
  if (hasDbPedagogyPermission(user, "canView") && !hasDbPedagogyPermission(user, "canEdit")) return true;
  const role = getPedagogieRole(user);
  return ["eleve", "parent", "consultation", "guest"].includes(role);
}
