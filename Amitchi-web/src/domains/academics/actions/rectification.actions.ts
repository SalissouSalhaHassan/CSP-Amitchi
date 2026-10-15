"use server";

import { db } from "@/infrastructure/database";
import { officialRectifications, schoolSessions, studentResults, resultsWorkflows } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { protectedDbAction } from "@/lib/protected-action";

const LOCKED_RESULT_WORKFLOW_STATUSES = ["VERROUILLE", "PUBLIE", "ARCHIVE"];
const RESULT_WORKFLOW_LOCK_MESSAGE = "Les résultats sont verrouillés, publiés ou archivés. Modification interdite.";

export async function submitOfficialRectification(params: {
  entityType: "student" | "grade";
  entityId: number;
  fieldName: string;
  newValue: string;
  reason: string;
  bypassPasscode: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();

    const bypassCode = process.env.RECTIFICATION_BYPASS_CODE;
    if (!bypassCode) {
      return { success: false, error: "Configuration serveur manquante : code de dérogation non défini." };
    }
    if (params.bypassPasscode !== bypassCode) {
      return { success: false, error: "Code d'autorisation de dérogation incorrect." };
    }

    // Get active session
    const activeSession = await db.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.schoolId, schoolId),
        eq(schoolSessions.isActive, true)
      )
    });

    if (!activeSession) {
      return { success: false, error: "Aucune session active trouvée." };
    }

    let oldValue = "";

    try {
      await db.transaction(async (tx) => {
        // 1. Fetch current value and perform update
        if (params.entityType === "student") {
          const student = await tx.query.students.findFirst({
            where: and(eq(students.id, params.entityId), eq(students.schoolId, schoolId))
          });
          if (!student) throw new Error("Student not found");
          oldValue = (student as any)[params.fieldName] != null ? String((student as any)[params.fieldName]) : "";

          await tx.update(students)
            .set({ [params.fieldName]: params.newValue })
            .where(eq(students.id, params.entityId));

        } else if (params.entityType === "grade") {
          const grade = await tx.query.studentResults.findFirst({
            where: eq(studentResults.id, params.entityId)
          });
          if (!grade) throw new Error("Grade record not found");

          const workflow = await tx.query.resultsWorkflows.findFirst({
            where: and(
              eq(resultsWorkflows.schoolId, schoolId),
              eq(resultsWorkflows.classId, Number(grade.classId)),
              eq(resultsWorkflows.sessionId, Number(grade.sessionId)),
              eq(resultsWorkflows.period, String(grade.term)),
              eq(resultsWorkflows.subjectId, Number(grade.subjectId))
            )
          });

          if (workflow?.status && LOCKED_RESULT_WORKFLOW_STATUSES.includes(workflow.status)) {
            throw new Error(RESULT_WORKFLOW_LOCK_MESSAGE);
          }

          oldValue = (grade as any)[params.fieldName] != null ? String((grade as any)[params.fieldName]) : "";

          await tx.update(studentResults)
            .set({ [params.fieldName]: Number(params.newValue) || 0 })
            .where(eq(studentResults.id, params.entityId));
        }

        // 2. Insert into official rectifications record table
        await tx.insert(officialRectifications).values({
          schoolId,
          sessionId: activeSession.id,
          entityType: params.entityType,
          entityId: params.entityId,
          reason: params.reason,
          oldValue: `${params.fieldName}: ${oldValue}`,
          newValue: `${params.fieldName}: ${params.newValue}`,
          requestedBy: user.id,
          approvedBy: user.id
        });

        // 3. Write to Audit Logs
        await tx.insert(auditLogs).values({
          schoolId,
          userId: user.id,
          action: `RECTIFICATION_OFFICIELLE_${params.entityType.toUpperCase()}`,
          tableName: params.entityType === "student" ? "students" : "student_results",
          recordId: params.entityId.toString(),
          newData: JSON.stringify({
            field: params.fieldName,
            oldValue,
            newValue: params.newValue,
            reason: params.reason
          }),
          ipAddress: "127.0.0.1",
          userAgent: "Server Action (Bypass)"
        });
      });

      revalidatePath("/dashboard/archives");
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Erreur lors de la rectification." };
    }
  });
}

// Fetch all official rectifications list
export async function getOfficialRectifications() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const list = await db.query.officialRectifications.findMany({
      where: eq(officialRectifications.schoolId, schoolId),
      orderBy: (t, { desc }) => [desc(t.createdAt)]
    });
    return { success: true, data: list };
  });
}
