import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { disciplineIncidents } from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, and } from "drizzle-orm";
import { MessagingService } from "@/shared/services/messaging.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  try {
    const body = await request.json();
    const {
      studentId,
      incidentType,
      severity = "Mineur",
      description,
      proposedAction,
      sanctionType = "Rappel à l'ordre",
      sanctionDurationDays = 0,
      notifyParent = true,
    } = body;

    if (!studentId || !incidentType) {
      return mobileJsonError("studentId et incidentType sont obligatoires.", 400);
    }

    const student = await db.query.students.findFirst({
      where: eq(students.id, Number(studentId)),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const schoolId = user.schoolId || student.schoolId || 1;
    const creatorName = (user as any).name || (user as any).nom || user.utilisateur || "Surveillant";

    const [inserted] = await db
      .insert(disciplineIncidents)
      .values({
        schoolId,
        studentId: Number(studentId),
        incidentType,
        severity,
        description: description || null,
        proposedAction: proposedAction || null,
        sanctionType,
        sanctionDurationDays: Number(sanctionDurationDays || 0),
        status: "En attente",
        parentNotified: false,
        createdBy: creatorName,
      })
      .returning();

    // Adjust score
    const penalty = severity === "Critique" ? -5 : severity === "Majeur" ? -2 : -1;
    const currentScore = student.behaviorScore ?? 20;
    await db.update(students).set({ behaviorScore: Math.max(0, currentScore + penalty) }).where(eq(students.id, Number(studentId)));

    let parentNotified = false;

    if (notifyParent) {
      const studentName = student.nomEtudiant || "l'élève";
      const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;

      if (parentPhone) {
        await MessagingService.sendDisciplineSanctionAlert({
          to: parentPhone,
          whatsapp: (student as any)?.whatsapp || parentPhone,
          studentName,
          incidentType,
          sanctionType,
          severity,
          durationDays: Number(sanctionDurationDays || 0),
          schoolName: "Edut Pro",
          sendSMS: true,
          sendWhatsApp: true,
        });
        parentNotified = true;
      }

      // In-app push notification
      const linkedParents = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.studentId, Number(studentId)),
            schoolId ? eq(users.schoolId, schoolId) : undefined
          )
        );

      for (const p of linkedParents) {
        await db.insert(notifications).values({
          userId: p.id,
          title: `⚠️ Avis Disciplinaire : ${studentName}`,
          content: `Incident signalé (${incidentType}) - Sanction : ${sanctionType}.`,
          type: "DISCIPLINE",
          category: "URGENCE",
          isRead: false,
        });
      }

      if (parentNotified) {
        await db
          .update(disciplineIncidents)
          .set({ parentNotified: true, parentNotificationSentAt: new Date() })
          .where(eq(disciplineIncidents.id, inserted.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Incident et sanction enregistrés avec succès.",
      incidentId: inserted.id,
      parentNotified,
    });
  } catch (error: any) {
    console.error("[Create Discipline Incident Error]:", error);
    return mobileJsonError(error?.message || "Erreur enregistrement incident", 500);
  }
}
