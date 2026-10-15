"use server";

import { db } from "@/infrastructure/database";
import {
  resultsWorkflows,
  schoolSessions,
  schoolClasses,
  schoolSubjects,
  teacherClassSubjects,
  studentResults,
  academicPeriods
} from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  getTeacherEmployee,
  getUserRoleType,
  verifyTeacherClassAccess,
  verifyTeacherClassSubjectAccess,
} from "@/domains/auth/services/rbac";
import { protectedDbAction } from "@/lib/protected-action";

type WorkflowAction =
  | "submit"
  | "request_correction"
  | "control"
  | "validate"
  | "lock"
  | "publish"
  | "archive"
  | "unlock";

type WorkflowParams = {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
};

const managementRoles = new Set(["directeur", "general_director", "level_director", "censeur"]);
const controlRoles = new Set(["censeur", "inspection", "directeur", "general_director", "level_director"]);
const directorRoles = new Set(["directeur", "general_director", "level_director"]);
const ministryPublishRoles = new Set(["super_admin", "ministere"]);

async function assertWorkflowSchoolScope(params: WorkflowParams) {
  const schoolId = await getActiveSchoolId();
  if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");

  const classe = await db.query.schoolClasses.findFirst({
    where: and(eq(schoolClasses.id, params.classId), eq(schoolClasses.schoolId, schoolId)),
    columns: { id: true },
  });
  if (!classe) throw new Error("Accès refusé pour cette école.");

  if (params.subjectId) {
    const subject = await db.query.schoolSubjects.findFirst({
      where: and(eq(schoolSubjects.id, params.subjectId), eq(schoolSubjects.schoolId, schoolId)),
      columns: { id: true },
    });
    if (!subject) throw new Error("Accès refusé pour cette matière.");
  }

  return schoolId;
}

async function assertWorkflowPermission(user: any, action: WorkflowAction, params: WorkflowParams) {
  await assertWorkflowSchoolScope(params);
  const roleType = await getUserRoleType(user);

  if (action === "submit") {
    if (roleType !== "teacher" && roleType !== "enseignant" && !user?.admin && !user?.superAdmin) {
      throw new Error("Seul l'enseignant peut soumettre les notes.");
    }
    const emp = await getTeacherEmployee(user);
    if (!emp && !user?.admin && !user?.superAdmin) throw new Error("Profil enseignant introuvable.");
    if (params.teacherId && emp && params.teacherId !== emp.id && !user?.admin && !user?.superAdmin) {
      throw new Error("Accès refusé: enseignant différent.");
    }

    if (!user?.admin && !user?.superAdmin) {
      const hasAccess = params.subjectId
        ? await verifyTeacherClassSubjectAccess(user, params.classId, params.subjectId)
        : await verifyTeacherClassAccess(user, params.classId);
      if (!hasAccess) throw new Error("Accès refusé pour cette classe ou matière.");
    }
    return { roleType, employeeId: emp?.id || null };
  }

  const isPrivileged =
    user?.admin === true ||
    user?.superAdmin === true ||
    directorRoles.has(roleType) ||
    ministryPublishRoles.has(roleType) ||
    roleType === "directeur" ||
    roleType === "general_director" ||
    roleType === "level_director";

  if (action === "request_correction" && (managementRoles.has(roleType) || isPrivileged)) {
    return { roleType, employeeId: null };
  }
  if (action === "control" && (controlRoles.has(roleType) || isPrivileged)) {
    return { roleType, employeeId: null };
  }
  if ((action === "validate" || action === "lock") && (directorRoles.has(roleType) || isPrivileged)) {
    return { roleType, employeeId: null };
  }
  if ((action === "publish" || action === "archive" || action === "unlock") && (ministryPublishRoles.has(roleType) || isPrivileged)) {
    return { roleType, employeeId: null };
  }

  throw new Error("Accès refusé pour cette étape du workflow.");
}

async function getActorEmployeeId(user: any) {
  if (user?.employeeId) return Number(user.employeeId);
  const emp = await getTeacherEmployee(user);
  return emp?.id || null;
}

export async function initResultsWorkflowTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS results_workflows (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        session_id INTEGER REFERENCES school_sessions(id) ON DELETE CASCADE,
        period VARCHAR(100) NOT NULL,
        class_id INTEGER REFERENCES school_classes(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'BROUILLON',
        submitted_by INTEGER REFERENCES employees(id),
        submitted_at TIMESTAMP,
        controlled_by INTEGER REFERENCES employees(id),
        controlled_at TIMESTAMP,
        validated_by INTEGER REFERENCES employees(id),
        validated_at TIMESTAMP,
        locked_by INTEGER REFERENCES employees(id),
        locked_at TIMESTAMP,
        published_by INTEGER REFERENCES employees(id),
        published_at TIMESTAMP,
        observation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initResultsWorkflowTable:", e.message);
    return { success: false, error: e.message };
  }
}

async function writeAuditLog(user: any, action: string, recordId: string, newData: any) {
  try {
    const schoolId = user?.schoolId || await getActiveSchoolId();
    await db.insert(auditLogs).values({
      schoolId,
      userId: user?.id || null,
      action,
      tableName: "results_workflows",
      recordId,
      newData: JSON.stringify(newData),
      ipAddress: "127.0.0.1",
      userAgent: "Server Action",
    });
  } catch (err) {
    console.error("writeAuditLog error:", err);
  }
}

// Helper to upsert a workflow status row
async function setWorkflowStatus(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  status: string;
  observation?: string;
  updateFields: any;
}) {
  await initResultsWorkflowTable();
  const schoolId = await getActiveSchoolId();
  if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");

  const conds = [
    eq(resultsWorkflows.schoolId, schoolId),
    eq(resultsWorkflows.sessionId, params.sessionId),
    eq(resultsWorkflows.period, params.period),
    eq(resultsWorkflows.classId, params.classId),
  ];

  if (params.subjectId) {
    conds.push(eq(resultsWorkflows.subjectId, params.subjectId));
  } else {
    conds.push(isNull(resultsWorkflows.subjectId));
  }

  const existing = await db.query.resultsWorkflows.findFirst({
    where: and(...conds),
  });

  const dbValues = {
    schoolId,
    sessionId: params.sessionId,
    period: params.period,
    classId: params.classId,
    subjectId: params.subjectId || null,
    teacherId: params.teacherId || null,
    status: params.status,
    observation: params.observation || null,
    updatedAt: new Date(),
    ...params.updateFields,
  };

  if (existing) {
    await db.update(resultsWorkflows)
      .set(dbValues)
      .where(and(eq(resultsWorkflows.id, existing.id), eq(resultsWorkflows.schoolId, schoolId)));
  } else {
    await db.insert(resultsWorkflows).values(dbValues);
  }

  revalidatePath("/dashboard/academics/grades");
  return { success: true };
}

// 1. Submit Grades (SAISIE_TERMINEE)
export async function submitGrades(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const permission = await assertWorkflowPermission(user, "submit", params);
    const empId = permission.employeeId;

    const res = await setWorkflowStatus({
      ...params,
      teacherId: empId || params.teacherId,
      status: "SAISIE_TERMINEE",
      updateFields: {
        submittedBy: empId,
        submittedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "SUBMIT_GRADES", `class-${params.classId}`, { ...params, status: "SAISIE_TERMINEE" });
    }
    return res;
  });
}

// 2. Request Correction (CORRECTION_DEMANDEE)
export async function requestGradeCorrection(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "request_correction", params);
    const res = await setWorkflowStatus({
      ...params,
      status: "CORRECTION_DEMANDEE",
      updateFields: {},
    });

    if (res.success) {
      await writeAuditLog(user, "REQUEST_CORRECTION", `class-${params.classId}`, { ...params, status: "CORRECTION_DEMANDEE" });
    }
    return res;
  });
}

// 3. Validate Grade Control (CONTROLE_PEDAGOGIQUE)
export async function validateGradeControl(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "control", params);
    const empId = await getActorEmployeeId(user);

    const res = await setWorkflowStatus({
      ...params,
      status: "CONTROLE_PEDAGOGIQUE",
      updateFields: {
        controlledBy: empId,
        controlledAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "VALIDATE_CONTROL", `class-${params.classId}`, { ...params, status: "CONTROLE_PEDAGOGIQUE" });
    }
    return res;
  });
}

// 4. Validate Class Council (VALIDATION_CONSEIL)
export async function validateClassCouncil(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "validate", params);
    const empId = await getActorEmployeeId(user);

    const res = await setWorkflowStatus({
      ...params,
      status: "VALIDATION_CONSEIL",
      updateFields: {
        validatedBy: empId,
        validatedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "VALIDATE_COUNCIL", `class-${params.classId}`, { ...params, status: "VALIDATION_CONSEIL" });
    }
    return res;
  });
}

// 5. Lock Results (VERROUILLE)
export async function lockResults(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "lock", params);
    const empId = await getActorEmployeeId(user);

    const res = await setWorkflowStatus({
      ...params,
      status: "VERROUILLE",
      updateFields: {
        lockedBy: empId,
        lockedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "LOCK_RESULTS", `class-${params.classId}`, { ...params, status: "VERROUILLE" });
    }
    return res;
  });
}

// 6. Publish Results (PUBLIE)
export async function publishResults(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "publish", params);
    const empId = await getActorEmployeeId(user);

    const res = await setWorkflowStatus({
      ...params,
      status: "PUBLIE",
      updateFields: {
        publishedBy: empId,
        publishedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "PUBLISH_RESULTS", `class-${params.classId}`, { ...params, status: "PUBLIE" });
    }
    return res;
  });
}

// 7. Archive Results Status (ARCHIVE)
export async function archiveResultsStatus(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "archive", params);
    const res = await setWorkflowStatus({
      ...params,
      status: "ARCHIVE",
      updateFields: {},
    });

    if (res.success) {
      await writeAuditLog(user, "ARCHIVE_STATUS", `class-${params.classId}`, { ...params, status: "ARCHIVE" });
    }
    return res;
  });
}

// 8. Exceptional Unlock (BROUILLON) for Super Admin
export async function unlockResultsException(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertWorkflowPermission(user, "unlock", params);
    const res = await setWorkflowStatus({
      ...params,
      status: "BROUILLON",
      updateFields: {
        lockedBy: null,
        lockedAt: null,
        publishedBy: null,
        publishedAt: null,
      },
    });

    if (res.success) {
      await writeAuditLog(user, "EXCEPTIONAL_UNLOCK_RESULTS", `class-${params.classId}`, { ...params, status: "BROUILLON" });
    }
    return res;
  });
}

// Get active results workflow status
export async function getResultsWorkflowStatus(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
}) {
  return protectedDbAction("Academics", "canView", async () => {
    await initResultsWorkflowTable();
    const schoolId = await getActiveSchoolId();

    const conds = [
      eq(resultsWorkflows.schoolId, schoolId),
      eq(resultsWorkflows.sessionId, params.sessionId),
      eq(resultsWorkflows.period, params.period),
      eq(resultsWorkflows.classId, params.classId),
    ];

    if (params.subjectId) {
      conds.push(eq(resultsWorkflows.subjectId, params.subjectId));
    } else {
      conds.push(isNull(resultsWorkflows.subjectId));
    }

    const row = await db.query.resultsWorkflows.findFirst({
      where: and(...conds),
      with: {
        teacher: true,
      }
    });

    return { data: row || null };
  });
}

// 9. Get Workflow Control Dashboard Data
export async function getWorkflowControlData() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const [
      sessions,
      periods,
      classes,
      subjects,
      employeesList,
      assignments,
      workflows,
      resultsData,
      studentsList,
      attendanceList
    ] = await Promise.all([
      db.query.schoolSessions.findMany(),
      db.query.academicPeriods.findMany(),
      db.query.schoolClasses.findMany({ where: eq(schoolClasses.schoolId, schoolId) }),
      db.query.schoolSubjects.findMany({ where: eq(schoolSubjects.schoolId, schoolId) }),
      db.query.employees.findMany({ where: eq(employees.schoolId, schoolId) }),
      db.query.teacherClassSubjects.findMany({ where: eq(teacherClassSubjects.schoolId, schoolId) }),
      db.query.resultsWorkflows.findMany({ where: eq(resultsWorkflows.schoolId, schoolId) }),
      db.query.studentResults.findMany(),
      db.query.students.findMany({ where: eq(students.schoolId, schoolId) }),
      db.query.studentAttendance.findMany(),
    ]);

    const classIds = new Set(classes.map(c => c.id));
    const filteredResults = (resultsData || []).filter(r => r.classId !== null && classIds.has(r.classId));
    const filteredAttendance = (attendanceList || []).filter(a => a.classId !== null && classIds.has(a.classId));

    return {
      sessions: sessions || [],
      periods: periods || [],
      classes: classes || [],
      subjects: subjects || [],
      employees: employeesList || [],
      assignments: assignments || [],
      workflows: workflows || [],
      resultsData: filteredResults,
      studentsList: studentsList || [],
      attendanceList: filteredAttendance,
    };
  });
}
