"use server";

import { db } from "@/infrastructure/database";
import { studentTermSummaries, resultsWorkflows, schoolClasses, studentResults } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { protectedDbAction } from "@/lib/protected-action";

export async function getClassCouncilData(params: {
  sessionId: number;
  period: string;
  classId: number;
}) {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, params.classId)
    });
    if (!cls) {
      return {
        students: [],
        summaries: [],
        studentGrades: [],
        workflow: null
      };
    }

    // 1. Fetch class students
    const cleanClassName = cls.className.trim();
    const studentsList = await db.query.students.findMany({
      where: and(
        schoolId ? eq(students.schoolId, schoolId) : undefined,
        or(
          eq(students.classe, cleanClassName),
          sql`LOWER(TRIM(${students.classe})) = LOWER(TRIM(${cleanClassName}))`,
          sql`REPLACE(LOWER(${students.classe}), ' ', '') = REPLACE(LOWER(${cleanClassName}), ' ', '')`
        )
      )
    });

    // 2. Fetch student term summaries (where we store conduite, decision, observation)
    const summaries = await db.query.studentTermSummaries.findMany({
      where: and(
        eq(studentTermSummaries.classId, params.classId),
        eq(studentTermSummaries.sessionId, params.sessionId),
        eq(studentTermSummaries.term, params.period)
      )
    });

    // 3. Fetch student results to compute student's overall averages
    const studentGrades = await db.query.studentResults.findMany({
      where: and(
        eq(studentResults.classId, params.classId),
        eq(studentResults.sessionId, params.sessionId),
        eq(studentResults.term, params.period)
      )
    });

    // 4. Fetch workflow status to see if it is locked/validated
    const workflow = await db.query.resultsWorkflows.findFirst({
      where: and(
        eq(resultsWorkflows.schoolId, schoolId),
        eq(resultsWorkflows.classId, params.classId),
        eq(resultsWorkflows.sessionId, params.sessionId),
        eq(resultsWorkflows.period, params.period)
      )
    });

    return {
      students: studentsList,
      summaries,
      studentGrades,
      workflow: workflow || null
    };
  });
}

export async function saveStudentCouncilDecision(params: {
  studentId: number;
  classId: number;
  sessionId: number;
  period: string;
  decision: string; // Admis, Redouble, etc.
  observation: string;
  conduite: number;
}) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const existing = await db.query.studentTermSummaries.findFirst({
      where: and(
        eq(studentTermSummaries.studentId, params.studentId),
        eq(studentTermSummaries.classId, params.classId),
        eq(studentTermSummaries.sessionId, params.sessionId),
        eq(studentTermSummaries.term, params.period)
      )
    });

    const values = {
      studentId: params.studentId,
      classId: params.classId,
      sessionId: params.sessionId,
      term: params.period,
      travail: params.decision,
      observation: params.observation,
      conduite: params.conduite,
      tableauHonneur: ["Tableau d’honneur", "Encouragement", "Félicitations"].includes(params.decision),
    };

    if (existing) {
      await db.update(studentTermSummaries).set(values).where(eq(studentTermSummaries.id, existing.id));
    } else {
      await db.insert(studentTermSummaries).values(values);
    }

    revalidatePath("/dashboard/academics/grades/conseil");
    return { success: true };
  });
}
