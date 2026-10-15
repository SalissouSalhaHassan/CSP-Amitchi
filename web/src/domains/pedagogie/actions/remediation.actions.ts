"use server";

import { db } from "@/infrastructure/database";
import { pedagogieRemediation } from "@/infrastructure/database/schema/pedagogie";
import { students } from "@/infrastructure/database/schema/students";
import { studentResults, schoolClasses } from "@/infrastructure/database/schema/academics";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { lmsAssignments, lmsSubmissions } from "@/infrastructure/database/schema/lms";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  getPedagogieRole,
  getPedagogieScope,
  canManageRemediation,
} from "@/domains/pedagogie/permissions";

export type RemediationFormData = {
  studentId: number;
  classId: number;
  subjectId: number;
  employeeId: number;
  difficulties: string;
  currentGrade?: number;
  targetGrade?: number;
  remediationPlan: string;
  sessionsPlanned?: number;
  sessionsCompleted?: number;
  status?: string; // "Actif" | "Clôturé"
  alertLevel?: string; // "Critique" | "Moyen" | "Faible"
};

// ─── Initialize table ────────────────────────────────────────────────────────
export async function initRemediationTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pedagogie_remediations (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        student_id INTEGER REFERENCES students(id),
        class_id INTEGER REFERENCES school_classes(id),
        subject_id INTEGER REFERENCES school_subjects(id),
        employee_id INTEGER REFERENCES employees(id),
        difficulties TEXT NOT NULL,
        current_grade DOUBLE PRECISION,
        target_grade DOUBLE PRECISION,
        remediation_plan TEXT NOT NULL,
        sessions_planned INTEGER DEFAULT 4,
        sessions_completed INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'Actif',
        alert_level VARCHAR(20) DEFAULT 'Moyen',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initRemediationTable:", e.message);
    return { success: false, error: e.message };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createRemediationPlan(data: RemediationFormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRemediation(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    const [plan] = await db.insert(pedagogieRemediation).values({
      schoolId,
      studentId: data.studentId,
      classId: data.classId,
      subjectId: data.subjectId,
      employeeId: data.employeeId,
      difficulties: data.difficulties,
      currentGrade: data.currentGrade != null ? data.currentGrade : null,
      targetGrade: data.targetGrade != null ? data.targetGrade : null,
      remediationPlan: data.remediationPlan,
      sessionsPlanned: data.sessionsPlanned ?? 4,
      sessionsCompleted: data.sessionsCompleted ?? 0,
      status: "Actif",
      alertLevel: data.alertLevel || "Moyen",
    }).returning();

    revalidatePath("/dashboard/pedagogie/remediation");
    return { success: true, data: plan };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── READ ────────────────────────────────────────────────────────────────────
export async function getRemediationPlans() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const scope = getPedagogieScope(user);
    if (scope.role === "guest") {
      return { success: false, error: "Accès non autorisé", data: [] };
    }

    const schoolId = await getActiveSchoolId();

    const data = await db.query.pedagogieRemediation.findMany({
      where: (t, { and: _and, eq: _eq }) => {
        const conds: any[] = [];

        // Scope filter
        if (!scope.allSchools && scope.schoolId) {
          conds.push(_eq(t.schoolId, scope.schoolId));
        } else {
          conds.push(_eq(t.schoolId, schoolId));
        }

        if (scope.role === "enseignant" && scope.teacherId) {
          conds.push(_eq(t.employeeId, scope.teacherId));
        } else if (scope.role === "eleve" && scope.studentId) {
          conds.push(_eq(t.studentId, scope.studentId));
        } else if (scope.role === "parent" && user.studentId) {
          conds.push(_eq(t.studentId, Number(user.studentId)));
        }

        return _and(...conds);
      },
      with: {
        student: true,
        class: true,
        subject: true,
        employee: true,
      },
      orderBy: (t) => [desc(t.createdAt)],
    });

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message, data: [] };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateRemediationPlan(id: number, data: Partial<RemediationFormData>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRemediation(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.update(pedagogieRemediation)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(pedagogieRemediation.id, id), eq(pedagogieRemediation.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/remediation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── ADD SESSION (Séance de soutien) ─────────────────────────────────────────
export async function addRemediationSession(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRemediation(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.update(pedagogieRemediation)
      .set({
        sessionsCompleted: sql`sessions_completed + 1`,
        updatedAt: new Date()
      })
      .where(and(eq(pedagogieRemediation.id, id), eq(pedagogieRemediation.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/remediation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── CLOSE PLAN (Clôturer) ───────────────────────────────────────────────────
export async function closeRemediationPlan(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRemediation(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.update(pedagogieRemediation)
      .set({
        status: "Clôturé",
        updatedAt: new Date()
      })
      .where(and(eq(pedagogieRemediation.id, id), eq(pedagogieRemediation.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/remediation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function deleteRemediationPlan(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRemediation(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.delete(pedagogieRemediation).where(and(eq(pedagogieRemediation.id, id), eq(pedagogieRemediation.schoolId, schoolId)));
    revalidatePath("/dashboard/pedagogie/remediation");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getAtRiskStudents() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const schoolId = await getActiveSchoolId();

    const result = await db.execute(sql`
      WITH student_grades AS (
        SELECT student_id, AVG(total_score) as avg_grade
        FROM student_results
        GROUP BY student_id
      ),
      student_absences AS (
        SELECT student_id, COUNT(*) as absence_count
        FROM student_attendance
        WHERE lower(status) IN ('absent', 'absente', 'abs')
        GROUP BY student_id
      ),
      student_unsubmitted AS (
        SELECT s.id as student_id, COUNT(a.id) as missing_count
        FROM students s
        CROSS JOIN lms_assignments a
        LEFT JOIN lms_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
        WHERE a.due_date < NOW() AND a.status = 'Active' AND sub.id IS NULL
        GROUP BY s.id
      )
      SELECT 
        s.id,
        s.nom_etudiant as "nomEtudiant",
        s.classe,
        sc.id as "classId",
        coalesce(sg.avg_grade, 0) as "averageGrade",
        coalesce(sa.absence_count, 0) as "absenceCount",
        coalesce(su.missing_count, 0) as "missingHomeworkCount"
      FROM students s
      LEFT JOIN school_classes sc ON sc.class_name = s.classe
      LEFT JOIN student_grades sg ON sg.student_id = s.id
      LEFT JOIN student_absences sa ON sa.student_id = s.id
      LEFT JOIN student_unsubmitted su ON su.student_id = s.id
      WHERE s.school_id = ${schoolId} AND (
        sg.avg_grade <= 10.0 OR
        sa.absence_count >= 3 OR
        su.missing_count >= 2
      )
      ORDER BY sg.avg_grade ASC, sa.absence_count DESC
      LIMIT 20
    `);

    // Normalize output for client rendering
    const rows = ((result as any).rows || result || []) as any[];
    return { success: true, data: rows };
  } catch (e: any) {
    console.error("getAtRiskStudents error:", e.message);
    return { success: false, error: e.message, data: [] };
  }
}
