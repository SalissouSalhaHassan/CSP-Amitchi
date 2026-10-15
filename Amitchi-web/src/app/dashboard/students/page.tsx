export const dynamic = "force-dynamic";

import { getStudents, fixStudentLevels } from "@/domains/students/actions/students.actions";
import { getSessionUserAction } from "@/domains/auth/actions/users.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import StudentsClient from "./students-client";

export default async function StudentsPage() {
  let initialStudents: any[] = [];
  let currentUser: any = null;
  let activeSchoolId: number | null = null;
  let canEdit = false;
  let canDelete = false;

  let getStudentsError = null;
  try {
    const [studentsRes, userRes, schoolId] = await Promise.all([
      getStudents(),
      getSessionUserAction(),
      getActiveSchoolId(),
    ]);

    getStudentsError = studentsRes?.error || null;
    initialStudents = (studentsRes?.data as any)?.data || (Array.isArray(studentsRes?.data) ? studentsRes?.data : []);
    currentUser = userRes?.data || null;
    activeSchoolId = schoolId;

    canEdit = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canEdit));
    canDelete = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canDelete));
  } catch (error: any) {
    getStudentsError = error.message;
    console.warn("[StudentsPage] Failed to fetch server data, falling back to client-side offline cache", error);
  }

  // Debug query: Count all students in DB and directly fetch students for schoolId 11 / activeSchoolId
  let debugInfo: any = null;
  try {
    const { db } = await import("@/infrastructure/database");
    const { sql, eq, or, isNull } = await import("drizzle-orm");
    const { students } = await import("@/infrastructure/database/schema/students");

    const totalCountRes = await db.execute(sql`SELECT count(*)::int as count FROM students`);
    const totalInDb = Number((totalCountRes as any)[0]?.count ?? 0);
    const bySchool = await db.execute(sql`SELECT school_id, count(*)::int as count FROM students GROUP BY school_id`);
    
    // Direct server-side fetch guarantee: if initialStudents is empty, load directly from DB
    if (!initialStudents || initialStudents.length === 0) {
      const targetSchoolId = activeSchoolId || currentUser?.schoolId || 11;
      const directRows = await db.select({
        id: students.id,
        schoolId: students.schoolId,
        numAdmission: students.numAdmission,
        nomEtudiant: students.nomEtudiant,
        nomArabe: students.nomArabe,
        sexe: students.sexe,
        dateNaissance: students.dateNaissance,
        classe: students.classe,
        educationalLevel: students.educationalLevel,
        statut: students.statut,
        fraisMensuels: students.fraisMensuels,
        fraisInscription: students.fraisInscription,
        fraisCogesCard: students.fraisCogesCard,
        fraisTransportInternat: students.fraisTransportInternat,
        ancienSolde: students.ancienSolde,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(targetSchoolId ? or(eq(students.schoolId, targetSchoolId), isNull(students.schoolId)) : sql`TRUE`);

      if (directRows && directRows.length > 0) {
        initialStudents = directRows as any;
      }
    }
  } catch (e: any) {
    console.error("[StudentsPage] direct DB fetch error:", e);
  }

  return (
    <StudentsClient 
      initialStudents={initialStudents}
      currentUser={currentUser}
      activeSchoolId={activeSchoolId}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}


