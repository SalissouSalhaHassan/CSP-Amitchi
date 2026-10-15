export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId, getActiveBranchData } from "@/domains/auth/services/school";
import { getActiveEducationalLevel, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { eq, desc } from "drizzle-orm";
import { getBoursesAndEcheanciersDashboardData } from "@/domains/finance/actions/bourses-echeanciers.actions";
import { BoursesEcheanciersClient } from "./bourses-echeanciers-client";

export default async function BoursesEcheanciersPage() {
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

  // Resolve branch and educational level scope
  const [{ branchData }, activeEduLevel] = await Promise.all([
    getActiveBranchData(user).catch(() => ({ branchData: null, allBranches: [] })),
    getActiveEducationalLevel(user).catch(() => null),
  ]);

  const activeLevel = activeEduLevel ||
    (branchData?.instType && !hasAllEducationalLevels(branchData.instType) ? branchData.instType : null) ||
    (user?.educationalLevel && !hasAllEducationalLevels(user.educationalLevel) ? user.educationalLevel : null);

  const isLevelScoped = Boolean(activeLevel && !hasAllEducationalLevels(activeLevel));

  // 1. Fetch dashboard data
  const dashRes = await getBoursesAndEcheanciersDashboardData();
  const initialData = dashRes.success && dashRes.data ? dashRes.data : {
    scholarships: [],
    allocations: [],
    schedules: [],
    metrics: {
      boursiersCount: 0,
      totalAllocatedBourses: 0,
      totalGrossSchedules: 0,
      totalNetSchedules: 0,
      totalPaidSchedules: 0,
      totalOverdueSchedules: 0,
      recoveryRate: 0,
    },
  };

  // 2. Fetch classes list for filtering and bulk generation
  const classesListRaw = await (readDb || db)
    .select({
      id: schoolClasses.id,
      className: schoolClasses.className,
      scolariteMensuelle: schoolClasses.scolariteMensuelle,
    })
    .from(schoolClasses)
    .where(schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined)
    .orderBy(schoolClasses.className);

  let classesList = classesListRaw.map((c) => ({
    id: c.id,
    className: c.className || `Classe #${c.id}`,
    scolariteMensuelle: c.scolariteMensuelle || 0,
  }));

  if (isLevelScoped && activeLevel) {
    classesList = classesList.filter((c) =>
      isStudentInEducationalLevel({ classe: c.className }, activeLevel)
    );
  }

  // 3. Fetch students list with financial balances
  const studentsListRaw = await (readDb || db)
    .select({
      id: students.id,
      nom: students.nomEtudiant,
      matricule: students.numAdmission,
      classe: students.classe,
      classId: students.classId,
      mobile: students.mobile,
      whatsapp: students.whatsapp,
      fraisMensuels: students.fraisMensuels,
      totalExpected: studentFees.totalExpected,
      totalPaid: studentFees.totalPaid,
      totalReduction: studentFees.totalReduction,
      balance: studentFees.balance,
    })
    .from(students)
    .leftJoin(studentFees, eq(students.id, studentFees.studentId))
    .where(schoolId ? eq(students.schoolId, schoolId) : undefined)
    .orderBy(students.nomEtudiant)
    .limit(1000);

  let studentsList = studentsListRaw.map((s) => ({
    id: s.id,
    nom: s.nom || "Étudiant",
    matricule: s.matricule || `MAT-${s.id}`,
    classe: s.classe || "Licence",
    classId: s.classId || null,
    mobile: s.mobile || "",
    whatsapp: s.whatsapp || "",
    fraisMensuels: s.fraisMensuels || 0,
    totalExpected: s.totalExpected ?? 700000,
    totalPaid: s.totalPaid ?? 0,
    totalReduction: s.totalReduction ?? 0,
    balance: s.balance ?? (s.totalExpected ?? 700000),
  }));

  if (isLevelScoped && activeLevel) {
    studentsList = studentsList.filter((s) =>
      isStudentInEducationalLevel({ classe: s.classe }, activeLevel)
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <BoursesEcheanciersClient
        initialData={initialData}
        studentsList={studentsList}
        classesList={classesList}
      />
    </div>
  );
}
