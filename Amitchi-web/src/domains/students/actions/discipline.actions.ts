"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  disciplineIncidents,
  disciplinaryCouncils,
  parentConvocations,
  behaviorRewards,
  counselorNotes,
} from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { incidentSchema, IncidentFormData } from "../validators/discipline.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── Discipline Dashboard Summary Stats ─────────────────────────────────────

export async function getDisciplineDashboardStats() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const [incidentsRes, councilsRes, convocationsRes, rewardsRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(disciplineIncidents)
        .where(schoolId ? eq(disciplineIncidents.schoolId, schoolId) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(disciplinaryCouncils)
        .where(
          and(
            schoolId ? eq(disciplinaryCouncils.schoolId, schoolId) : undefined,
            eq(disciplinaryCouncils.status, "Programmé")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(parentConvocations)
        .where(
          and(
            schoolId ? eq(parentConvocations.schoolId, schoolId) : undefined,
            eq(parentConvocations.status, "Envoyé")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(behaviorRewards)
        .where(schoolId ? eq(behaviorRewards.schoolId, schoolId) : undefined),
    ]);

    return {
      totalIncidents: Number(incidentsRes[0]?.count || 0),
      activeCouncils: Number(councilsRes[0]?.count || 0),
      pendingConvocations: Number(convocationsRes[0]?.count || 0),
      totalRewards: Number(rewardsRes[0]?.count || 0),
    };
  });
}

// ─── Incidents & Sanctions Actions ──────────────────────────────────────────

export async function getIncidents() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const data = await db.query.disciplineIncidents.findMany({
      where: eq(disciplineIncidents.schoolId, schoolId),
      with: {
        student: true,
      },
      orderBy: [desc(disciplineIncidents.date)],
    });

    return { data };
  });
}

export async function createIncident(formData: IncidentFormData & {
  sanctionType?: string;
  sanctionDurationDays?: number;
  notifyParent?: boolean;
}) {
  const validation = incidentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, incidentType, severity, description, proposedAction, status } = validation.data;
    const sanctionType = formData.sanctionType || "Rappel à l'ordre";
    const sanctionDurationDays = Number(formData.sanctionDurationDays || 0);
    const notifyParent = formData.notifyParent ?? true;

    // Validate target student school
    const studentObj = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      ),
    });
    if (!studentObj) {
      return { error: "Étudiant introuvable ou non autorisé." };
    }

    const creatorName = (user as any).name || (user as any).nom || user.utilisateur || "Surveillant Général";

    const [inserted] = await db.insert(disciplineIncidents).values({
      schoolId,
      studentId,
      incidentType,
      severity: severity || "Mineur",
      description: description || null,
      proposedAction: proposedAction || null,
      sanctionType,
      sanctionDurationDays,
      status: status || "En attente",
      parentNotified: false,
      createdBy: creatorName,
    }).returning();

    // Deduct behavior points based on severity/sanction
    let pointsPenalty = 0;
    if (severity === "Critique" || sanctionType.includes("Exclusion")) {
      pointsPenalty = -5;
    } else if (severity === "Majeur" || sanctionType.includes("Avertissement") || sanctionType.includes("Blâme")) {
      pointsPenalty = -2;
    } else {
      pointsPenalty = -1;
    }

    const currentScore = studentObj.behaviorScore ?? 20;
    const newScore = Math.max(0, currentScore + pointsPenalty);
    await db.update(students).set({ behaviorScore: newScore }).where(eq(students.id, studentId));

    // Send instant parent notification if enabled
    if (notifyParent) {
      try {
        const studentName = studentObj.nomEtudiant || "l'élève";
        const parentPhone = (studentObj as any)?.mobile || (studentObj as any)?.whatsapp || (studentObj as any)?.telephoneParent;

        if (parentPhone) {
          await MessagingService.sendDisciplineSanctionAlert({
            to: parentPhone,
            whatsapp: (studentObj as any)?.whatsapp || parentPhone,
            studentName,
            incidentType,
            sanctionType,
            severity,
            durationDays: sanctionDurationDays,
            schoolName: "Edut Pro",
            sendSMS: true,
            sendWhatsApp: true,
          });
        }

        // Send In-app Push Notification to student/parent users
        const linkedParents = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.studentId, studentId),
              eq(users.schoolId, schoolId)
            )
          );

        for (const p of linkedParents) {
          await db.insert(notifications).values({
            userId: p.id,
            title: `⚠️ Avis Disciplinaire : ${studentName}`,
            content: `Mesure disciplinaire prononcée pour ${incidentType} : ${sanctionType}. Note de conduite actuelle : ${newScore}/20.`,
            type: "DISCIPLINE",
            category: "URGENCE",
            isRead: false,
          });
        }

        await db
          .update(disciplineIncidents)
          .set({ parentNotified: true, parentNotificationSentAt: new Date() })
          .where(eq(disciplineIncidents.id, inserted.id));
      } catch (err) {
        console.error("⚠️ Failed to send discipline parent notification:", err);
      }
    }

    revalidatePath("/dashboard/students/discipline");
    return { success: true, incidentId: inserted.id };
  });
}

export async function updateIncident(id: number, formData: IncidentFormData & {
  sanctionType?: string;
  sanctionDurationDays?: number;
}) {
  const validation = incidentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, incidentType, severity, description, proposedAction, status } = validation.data;

    const existing = await db.query.disciplineIncidents.findFirst({
      where: and(
        eq(disciplineIncidents.id, id),
        eq(disciplineIncidents.schoolId, schoolId)
      ),
    });
    if (!existing) {
      return { error: "Incident introuvable ou non autorisé." };
    }

    await db.update(disciplineIncidents)
      .set({
        studentId,
        incidentType,
        severity,
        description,
        proposedAction,
        sanctionType: formData.sanctionType || existing.sanctionType,
        sanctionDurationDays: formData.sanctionDurationDays !== undefined ? Number(formData.sanctionDurationDays) : existing.sanctionDurationDays,
        status,
      })
      .where(eq(disciplineIncidents.id, id));

    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

export async function deleteIncident(id: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    await db
      .delete(disciplineIncidents)
      .where(
        and(
          eq(disciplineIncidents.id, id),
          eq(disciplineIncidents.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

// ─── Disciplinary Councils Actions (Conseils de Discipline) ─────────────────

export async function getDisciplinaryCouncils() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const data = await db.query.disciplinaryCouncils.findMany({
      where: eq(disciplinaryCouncils.schoolId, schoolId),
      with: {
        student: true,
        incident: true,
      },
      orderBy: [desc(disciplinaryCouncils.sessionDate)],
    });

    return { data };
  });
}

export async function createDisciplinaryCouncil(data: {
  studentId: number;
  incidentId?: number | null;
  sessionDate: string; // ISO date string
  location?: string;
  presidentName?: string;
  membersPresent?: string;
  parentConvocationStatus?: string;
  reproachedFacts: string;
  studentDefense?: string;
  decisionType: string;
  exclusionDays?: number;
  exclusionStartDate?: string;
  exclusionEndDate?: string;
  reportSummary?: string;
  status?: string;
  notifyParent?: boolean;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const student = await db.query.students.findFirst({
      where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Élève introuvable." };

    const president = data.presidentName || (user as any).name || user.utilisateur || "Le Proviseur";

    const [inserted] = await db
      .insert(disciplinaryCouncils)
      .values({
        schoolId,
        studentId: data.studentId,
        incidentId: data.incidentId || null,
        sessionDate: new Date(data.sessionDate),
        location: data.location || "Salle de délibération",
        presidentName: president,
        membersPresent: data.membersPresent || "Proviseur, Censeur, Professeur Principal, Représentant des Parents",
        parentConvocationStatus: data.parentConvocationStatus || "Convoqué",
        reproachedFacts: data.reproachedFacts,
        studentDefense: data.studentDefense || null,
        decisionType: data.decisionType,
        exclusionDays: Number(data.exclusionDays || 0),
        exclusionStartDate: data.exclusionStartDate || null,
        exclusionEndDate: data.exclusionEndDate || null,
        reportSummary: data.reportSummary || null,
        status: data.status || "Programmé",
        parentNotified: false,
      })
      .returning();

    // Auto notify parents
    if (data.notifyParent) {
      try {
        const studentName = student.nomEtudiant || "l'élève";
        const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;

        if (parentPhone) {
          const sessionDateFormatted = new Date(data.sessionDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          await MessagingService.sendParentConvocationAlert({
            to: parentPhone,
            whatsapp: (student as any)?.whatsapp || parentPhone,
            studentName,
            reason: `Conseil de Discipline : ${data.reproachedFacts}`,
            convocationDate: sessionDateFormatted,
            location: data.location || "Salle de délibération",
            schoolName: "Edut Pro",
            sendSMS: true,
            sendWhatsApp: true,
          });

          await db
            .update(disciplinaryCouncils)
            .set({ parentNotified: true, parentNotificationSentAt: new Date() })
            .where(eq(disciplinaryCouncils.id, inserted.id));
        }
      } catch (err) {
        console.error("⚠️ Failed to notify parent for council:", err);
      }
    }

    revalidatePath("/dashboard/students/discipline");
    return { success: true, councilId: inserted.id };
  });
}

export async function deleteDisciplinaryCouncil(id: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    await db
      .delete(disciplinaryCouncils)
      .where(
        and(
          eq(disciplinaryCouncils.id, id),
          eq(disciplinaryCouncils.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

// ─── Parent Convocations Actions (استدعاءات الأولياء) ─────────────────────────

export async function getParentConvocations() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const data = await db.query.parentConvocations.findMany({
      where: eq(parentConvocations.schoolId, schoolId),
      with: {
        student: true,
      },
      orderBy: [desc(parentConvocations.convocationDate)],
    });

    return { data };
  });
}

export async function createParentConvocation(data: {
  studentId: number;
  incidentId?: number | null;
  reason: string;
  convocationDate: string; // ISO date string
  location?: string;
  channel?: string;
  notes?: string;
  notifyParent?: boolean;
}) {
  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const student = await db.query.students.findFirst({
      where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Élève introuvable." };

    const [inserted] = await db
      .insert(parentConvocations)
      .values({
        schoolId,
        studentId: data.studentId,
        incidentId: data.incidentId || null,
        reason: data.reason,
        convocationDate: new Date(data.convocationDate),
        location: data.location || "Bureau du Censeur / Surveillant Général",
        channel: data.channel || "WhatsApp",
        status: "Envoyé",
        parentNotified: false,
        notes: data.notes || null,
      })
      .returning();

    if (data.notifyParent ?? true) {
      try {
        const studentName = student.nomEtudiant || "l'élève";
        const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;

        if (parentPhone) {
          const dateFmt = new Date(data.convocationDate).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          await MessagingService.sendParentConvocationAlert({
            to: parentPhone,
            whatsapp: (student as any)?.whatsapp || parentPhone,
            studentName,
            reason: data.reason,
            convocationDate: dateFmt,
            location: data.location || "Bureau du Censeur",
            schoolName: "Edut Pro",
            sendSMS: true,
            sendWhatsApp: true,
          });

          await db
            .update(parentConvocations)
            .set({ parentNotified: true, parentNotificationSentAt: new Date() })
            .where(eq(parentConvocations.id, inserted.id));
        }
      } catch (err) {
        console.error("⚠️ Failed to send convocation message:", err);
      }
    }

    revalidatePath("/dashboard/students/discipline");
    return { success: true, convocationId: inserted.id };
  });
}

export async function deleteParentConvocation(id: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    await db
      .delete(parentConvocations)
      .where(
        and(
          eq(parentConvocations.id, id),
          eq(parentConvocations.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

// ─── Behavior Rewards Actions ───────────────────────────────────────────────

export async function saveBehaviorReward(data: {
  studentId: number;
  rewardType: string;
  pointsEffect: number;
  reason: string;
  grantedBy?: string;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, rewardType, pointsEffect, reason, grantedBy } = data;

    const student = await db.query.students.findFirst({
      where: and(eq(students.id, studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) {
      return { error: "Étudiant introuvable ou non autorisé." };
    }

    await db.insert(behaviorRewards).values({
      studentId,
      schoolId,
      rewardType,
      pointsEffect,
      reason,
      grantedBy: grantedBy || (user as any).name || "Enseignant",
    });

    const currentScore = student.behaviorScore || 20;
    await db
      .update(students)
      .set({ behaviorScore: Math.min(20, currentScore + pointsEffect) })
      .where(eq(students.id, studentId));

    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

export async function deleteBehaviorReward(id: number, studentId: number) {
  return protectedDbAction("Students", "canDelete", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const reward = await db.query.behaviorRewards.findFirst({
      where: and(eq(behaviorRewards.id, id), eq(behaviorRewards.schoolId, schoolId)),
    });

    if (!reward) return { error: "Récompense introuvable." };

    const student = await db.query.students.findFirst({
      where: and(eq(students.id, studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Étudiant non autorisé." };

    const currentScore = student.behaviorScore || 20;
    await db
      .update(students)
      .set({ behaviorScore: Math.max(0, currentScore - reward.pointsEffect) })
      .where(eq(students.id, studentId));

    await db.delete(behaviorRewards).where(eq(behaviorRewards.id, id));
    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

export async function getStudentBehaviorRewards(studentId: number) {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId;
    if (!schoolId) return { data: [] };

    const data = await db.query.behaviorRewards.findMany({
      where: and(
        eq(behaviorRewards.studentId, studentId),
        eq(behaviorRewards.schoolId, schoolId)
      ),
      orderBy: [desc(behaviorRewards.createdAt)],
    });
    return { data };
  });
}

// ─── Counselor Notes Actions ────────────────────────────────────────────────

export async function saveCounselorNote(data: {
  studentId: number;
  noteType: string;
  confidentialContent: string;
  recommendations?: string;
  isSecret?: boolean;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, noteType, confidentialContent, recommendations, isSecret } = data;

    const student = await db.query.students.findFirst({
      where: and(eq(students.id, studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Étudiant non autorisé." };

    await db.insert(counselorNotes).values({
      studentId,
      schoolId,
      noteType,
      confidentialContent,
      recommendations: recommendations || null,
      isSecret: isSecret ?? true,
      counselorId: user.id,
    });

    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}

export async function getStudentCounselorNotes(studentId: number) {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId;
    if (!schoolId) return { data: [] };

    const data = await db.query.counselorNotes.findMany({
      where: and(
        eq(counselorNotes.studentId, studentId),
        eq(counselorNotes.schoolId, schoolId)
      ),
      orderBy: [desc(counselorNotes.createdAt)],
    });
    return { data };
  });
}

export async function deleteCounselorNote(id: number, studentId: number) {
  return protectedDbAction("Students", "canDelete", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    await db.delete(counselorNotes).where(
      and(eq(counselorNotes.id, id), eq(counselorNotes.schoolId, schoolId))
    );
    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}
