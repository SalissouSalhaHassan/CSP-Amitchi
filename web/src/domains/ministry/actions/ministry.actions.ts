"use server";

import { readDb } from "@/infrastructure/database";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { schools } from "@/infrastructure/database/schema/auth";
import { schoolClasses, studentResults } from "@/infrastructure/database/schema/academics";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { employees } from "@/infrastructure/database/schema/hr";
import { inventoryItems } from "@/infrastructure/database/schema/inventory";
import { libraryBooks } from "@/infrastructure/database/schema/library";
import { students } from "@/infrastructure/database/schema/students";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { inArray } from "drizzle-orm";

export interface MinistrySchoolData {
  code: string;
  name: string;
  type: "Public" | "Privé";
  cycle: "Préscolaire" | "Primaire" | "Collège" | "Lycée" | "Technique" | "Supérieur" | string;
  region: string;
  department: string;
  inspection: string;
  commune: string;
  eleves: number;
  filles: number;
  garcons: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  latrines: boolean;
  manqueEnseignants: number;
  manqueSalles: number;
  manqueLivres: number;
  abandonRate: number;
  completion: number;
  lastDeclaration: string;
  successRate: number;
  attendanceRate: number;
  status: "Valide" | "À vérifier" | "Incomplet";
}

const normalize = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const hasText = (value: unknown) => String(value || "").trim().length > 0;

type ScopeUser = {
  schoolId?: number | null;
  region?: string | null;
  dren?: string | null;
  departement?: string | null;
  department?: string | null;
  dden?: string | null;
  inspection?: string | null;
  emplacement?: string | null;
};

function inferCycle(value: string | null | undefined): MinistrySchoolData["cycle"] {
  if (!value || !value.trim()) return "Primaire";
  const norm = normalize(value);
  if (norm.includes("prescolaire") || norm.includes("maternelle")) return "Préscolaire";
  if (norm.includes("college") || norm.includes("moyen") || norm.includes("1er cycle")) return "Collège";
  if (norm.includes("lycee") || norm.includes("secondaire") || norm.includes("2nd cycle")) return "Lycée";
  if (norm.includes("superieur") || norm.includes("universite") || norm.includes("licence") || norm.includes("master")) return "Supérieur";
  if (norm.includes("technique") || norm.includes("professionnel")) return "Technique";
  return value.trim() as any;
}

function inferType(value: string | null | undefined): MinistrySchoolData["type"] {
  return normalize(value).startsWith("priv") ? "Privé" : "Public";
}

function getUserScopeValue(user: ScopeUser, keys: Array<keyof ScopeUser>) {
  for (const key of keys) {
    if (hasText(user?.[key])) return String(user[key]);
  }
  return "";
}

function branchMatchesScope(branch: typeof schoolBranches.$inferSelect, user: ScopeUser, roleType: string) {
  if (roleType === "super_admin" || roleType === "ministere") return true;

  const branchRegion = branch.region || branch.dren;
  const branchDepartment = branch.department || branch.dden;
  const branchInspection = branch.inspection;

  if (roleType === "dren") {
    const region = getUserScopeValue(user, ["region", "dren", "emplacement"]);
    return Boolean(region) && normalize(branchRegion) === normalize(region);
  }

  if (roleType === "dden") {
    const region = getUserScopeValue(user, ["region", "dren"]);
    const department = getUserScopeValue(user, ["departement", "department", "dden", "emplacement"]);
    if (!department || normalize(branchDepartment) !== normalize(department)) return false;
    return !region || normalize(branchRegion) === normalize(region);
  }

  if (roleType === "inspection") {
    const inspection = getUserScopeValue(user, ["inspection", "emplacement"]);
    const region = getUserScopeValue(user, ["region", "dren"]);
    const department = getUserScopeValue(user, ["departement", "department", "dden"]);
    if (!inspection || normalize(branchInspection) !== normalize(inspection)) return false;
    if (region && normalize(branchRegion) !== normalize(region)) return false;
    return !department || normalize(branchDepartment) === normalize(department);
  }

  return user?.schoolId ? branch.schoolId === user.schoolId : false;
}

function latestDate(values: Array<Date | string | null | undefined>) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value as Date | string))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return (dates[0] || new Date()).toISOString().slice(0, 10);
}

function rate(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function isActiveStudent(status: string | null | undefined) {
  const norm = normalize(status || "Actif");
  return !["abandon", "inactif", "sorti", "radie", "exclu"].some((marker) => norm.includes(marker));
}

function isDropoutStudent(status: string | null | undefined) {
  const norm = normalize(status);
  return ["abandon", "inactif", "sorti", "radie", "exclu"].some((marker) => norm.includes(marker));
}

function isTeacherEmployee(employee: typeof employees.$inferSelect) {
  const text = normalize([
    employee.poste,
    employee.fonction,
    employee.departement,
    employee.categorie,
  ].filter(Boolean).join(" "));

  return ["enseign", "prof", "instituteur", "maitre", "maitresse", "teacher"].some((marker) => text.includes(marker));
}

function itemMatches(item: { name?: string | null; location?: string | null }, categoryName: string | undefined, markers: string[]) {
  const text = normalize([item.name, item.location, categoryName].filter(Boolean).join(" "));
  return markers.some((marker) => text.includes(marker));
}

function sumInventoryQuantity(items: Array<typeof inventoryItems.$inferSelect>) {
  return items.reduce((total, item) => total + Number(item.quantity || 0), 0);
}

export async function getMinistrySchoolsData(): Promise<{ success: boolean; error?: string; data: MinistrySchoolData[] }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Non autorisé", data: [] as MinistrySchoolData[] };
  return getMinistrySchoolsDataForUser(user);
}

export async function getMinistrySchoolsDataForUser(user: any): Promise<{ success: boolean; error?: string; data: MinistrySchoolData[] }> {
  const roleType = await getUserRoleType(user);
  const allBranches = await readDb.query.schoolBranches.findMany({
    orderBy: [schoolBranches.createdAt],
  });

  const scopedBranches = allBranches.filter((branch) => branchMatchesScope(branch, user, roleType));
  const schoolIds = Array.from(new Set(scopedBranches.map((branch) => branch.schoolId).filter((id): id is number => Boolean(id))));

  if (schoolIds.length === 0) {
    return { success: true, data: [] as MinistrySchoolData[] };
  }

  const [schoolRows, studentRows, employeeRows, classRows, bookRows, inventoryRows, inventoryCategoryRows] = await Promise.all([
    readDb.query.schools.findMany({ where: inArray(schools.id, schoolIds) }),
    readDb.query.students.findMany({ where: inArray(students.schoolId, schoolIds) }),
    readDb.query.employees.findMany({ where: inArray(employees.schoolId, schoolIds) }),
    readDb.query.schoolClasses.findMany({ where: inArray(schoolClasses.schoolId, schoolIds) }),
    readDb.query.libraryBooks.findMany({ where: inArray(libraryBooks.schoolId, schoolIds) }).catch(() => []),
    readDb.query.inventoryItems.findMany({ where: inArray(inventoryItems.schoolId, schoolIds) }).catch(() => []),
    readDb.query.inventoryCategories.findMany().catch(() => []),
  ]);
  const studentIds = studentRows.map((student) => student.id).filter(Boolean);
  const [resultRows, attendanceRows] = studentIds.length > 0
    ? await Promise.all([
        readDb.query.studentResults.findMany({ where: inArray(studentResults.studentId, studentIds) }).catch(() => []),
        readDb.query.studentAttendance.findMany({ where: inArray(studentAttendance.studentId, studentIds) }).catch(() => []),
      ])
    : [[], []];

  const schoolById = new Map(schoolRows.map((school) => [school.id, school]));
  const studentsBySchool = groupBy(studentRows, (student) => student.schoolId || 0);
  const employeesBySchool = groupBy(employeeRows, (employee) => employee.schoolId || 0);
  const classesBySchool = groupBy(classRows, (classe) => classe.schoolId || 0);
  const booksBySchool = groupBy(bookRows, (book) => book.schoolId || 0);
  const inventoryBySchool = groupBy(inventoryRows, (item) => item.schoolId || 0);
  const categoryById = new Map(inventoryCategoryRows.map((category) => [category.id, category.name]));
  const studentSchoolById = new Map(studentRows.map((student) => [student.id, student.schoolId || 0]));

  const resultsBySchool = groupBy(
    resultRows.filter((result) => result.studentId && studentSchoolById.has(result.studentId)),
    (result) => studentSchoolById.get(result.studentId || 0) || 0
  );
  const attendanceBySchool = groupBy(
    attendanceRows.filter((row) => row.studentId && studentSchoolById.has(row.studentId)),
    (row) => studentSchoolById.get(row.studentId || 0) || 0
  );

  const data = scopedBranches.map((branch) => {
    const schoolId = branch.schoolId || 0;
    const school = schoolById.get(schoolId);
    const allSchoolStudents = studentsBySchool.get(schoolId) || [];
    const schoolStudents = allSchoolStudents.filter((student) => isActiveStudent(student.statut));
    const schoolEmployees = employeesBySchool.get(schoolId) || [];
    const schoolTeachers = schoolEmployees.filter(isTeacherEmployee);
    const schoolClasses = classesBySchool.get(schoolId) || [];
    const schoolResults = resultsBySchool.get(schoolId) || [];
    const schoolAttendance = attendanceBySchool.get(schoolId) || [];
    const schoolBooks = booksBySchool.get(schoolId) || [];
    const schoolInventory = inventoryBySchool.get(schoolId) || [];

    const filles = schoolStudents.filter((student) => normalize(student.sexe).startsWith("f")).length;
    const garcons = schoolStudents.filter((student) => normalize(student.sexe).startsWith("m") || normalize(student.sexe).startsWith("g")).length;
    const passed = schoolResults.filter((result) => Number(result.totalScore || 0) >= 10).length;
    const present = schoolAttendance.filter((row) => {
      const status = normalize(row.status);
      return status.includes("present") || status.includes("retard") || status.includes("excuse");
    }).length;

    const requiredTeachers = Math.ceil(schoolStudents.length / 35);
    const requiredRooms = Math.ceil(schoolStudents.length / 45);
    const dropoutCount = allSchoolStudents.filter((student) => isDropoutStudent(student.statut)).length;
    const libraryBookCount = schoolBooks.reduce((total, book) => total + Number(book.totalQuantity || 0), 0);
    const textbookInventory = schoolInventory.filter((item) => itemMatches(
      item,
      item.categoryId ? categoryById.get(item.categoryId) : undefined,
      ["manuel", "livre", "book", "guide"]
    ));
    const totalBooks = libraryBookCount + sumInventoryQuantity(textbookInventory);
    const hasWater = schoolInventory.some((item) => itemMatches(
      item,
      item.categoryId ? categoryById.get(item.categoryId) : undefined,
      ["eau", "forage", "puits", "robinet", "water"]
    ));
    const hasElectricity = schoolInventory.some((item) => itemMatches(
      item,
      item.categoryId ? categoryById.get(item.categoryId) : undefined,
      ["electric", "electricite", "solaire", "panneau", "groupe electrogene", "generator"]
    ));
    const hasLatrines = schoolInventory.some((item) => itemMatches(
      item,
      item.categoryId ? categoryById.get(item.categoryId) : undefined,
      ["latrine", "toilette", "wc", "sanitaire"]
    ));

    const completionFields = [
      branch.schoolCode,
      branch.branchName || school?.name,
      branch.instCategory,
      branch.instType,
      branch.region || branch.dren,
      branch.department || branch.dden,
      branch.inspection,
      branch.commune,
      schoolStudents.length > 0 ? "students" : "",
      schoolTeachers.length > 0 ? "teachers" : "",
      schoolClasses.length > 0 ? "classes" : "",
    ];
    const completion = rate(completionFields.filter(hasText).length, completionFields.length);

    return {
      code: branch.schoolCode || school?.slug || `ETB-${schoolId}`,
      name: branch.branchName || school?.name || `Établissement ${schoolId}`,
      type: inferType(branch.instCategory),
      cycle: inferCycle(branch.instType),
      region: branch.region || branch.dren || "Non renseigné",
      department: branch.department || branch.dden || "Non renseigné",
      inspection: branch.inspection || "Non renseigné",
      commune: branch.commune || "Non renseigné",
      eleves: schoolStudents.length,
      filles,
      garcons: garcons || Math.max(0, schoolStudents.length - filles),
      enseignants: schoolTeachers.length,
      salles: schoolClasses.length,
      eau: hasWater,
      electricite: hasElectricity,
      latrines: hasLatrines,
      manqueEnseignants: Math.max(0, requiredTeachers - schoolTeachers.length),
      manqueSalles: Math.max(0, requiredRooms - schoolClasses.length),
      manqueLivres: Math.max(0, schoolStudents.length - totalBooks),
      abandonRate: rate(dropoutCount, allSchoolStudents.length),
      completion,
      lastDeclaration: latestDate([
        branch.createdAt,
        school?.createdAt,
        ...schoolStudents.map((student) => student.createdAt),
        ...schoolTeachers.map((employee) => employee.createdAt),
        ...schoolClasses.map((classe) => classe.createdAt),
        ...schoolResults.map((result) => result.createdAt),
        ...schoolAttendance.map((row) => row.date),
        ...schoolBooks.map((book) => book.createdAt),
        ...schoolInventory.map((item) => item.createdAt),
      ]),
      successRate: rate(passed, schoolResults.length),
      attendanceRate: rate(present, schoolAttendance.length),
      status: completion >= 90 ? "Valide" : completion >= 60 ? "À vérifier" : "Incomplet",
    } satisfies MinistrySchoolData;
  });

  return { success: true, data };
}

function groupBy<T>(items: T[], getKey: (item: T) => number) {
  const grouped = new Map<number, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const bucket = grouped.get(key) || [];
    bucket.push(item);
    grouped.set(key, bucket);
  }
  return grouped;
}
