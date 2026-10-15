import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { infirmaryVisits } from "@/infrastructure/database/schema/health";
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
      symptoms,
      temperature,
      bloodPressure,
      heartRate,
      diagnosis,
      careProvided,
      prescriptions,
      severity = "Bénin",
      outcome = "Retour en classe",
      notifyParent = true,
      notes,
    } = body;

    if (!studentId || !symptoms) {
      return mobileJsonError("studentId et symptoms sont obligatoires.", 400);
    }

    const student = await db.query.students.findFirst({
      where: eq(students.id, Number(studentId)),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const schoolId = user.schoolId || student.schoolId || 1;

    const nurseName = (user as any).name || (user as any).nom || user.utilisateur || "Infirmerie";
    const nurseId = user.employeeId || null;

    const [inserted] = await db
      .insert(infirmaryVisits)
      .values({
        schoolId,
        studentId: Number(studentId),
        visitDate: new Date(),
        nurseId,
        nurseName,
        symptoms,
        temperature: temperature ? Number(temperature) : null,
        bloodPressure: bloodPressure || null,
        heartRate: heartRate ? Number(heartRate) : null,
        diagnosis: diagnosis || null,
        careProvided: careProvided || null,
        prescriptions: prescriptions || null,
        severity,
        outcome,
        parentNotified: false,
        notes: notes || null,
      })
      .returning();

    let parentNotified = false;

    if (notifyParent || severity === "Urgent" || severity === "Urgent / Critique") {
      const studentName = student.nomEtudiant || "l'élève";
      const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;

      if (parentPhone) {
        await MessagingService.sendInfirmaryAlert({
          to: parentPhone,
          whatsapp: (student as any)?.whatsapp || parentPhone,
          studentName,
          symptoms,
          temperature: temperature ? Number(temperature) : undefined,
          severity,
          outcome,
          careProvided: careProvided || undefined,
          schoolName: "Edut Pro",
          sendSMS: true,
          sendWhatsApp: true,
        });
        parentNotified = true;
      }

      // Insert in-app push notification for parents
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
          title: `🏥 Avis Infirmerie : ${studentName}`,
          content: `Votre enfant a été admis à l'infirmerie pour : ${symptoms}. Température : ${temperature ? temperature + "°C" : "N/A"}. Décision : ${outcome}.`,
          type: "ALERTE_SANTE",
          category: "URGENCE",
          isRead: false,
        });
      }

      if (parentNotified) {
        await db
          .update(infirmaryVisits)
          .set({
            parentNotified: true,
            parentNotificationSentAt: new Date(),
          })
          .where(eq(infirmaryVisits.id, inserted.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Passage à l'infirmerie enregistré avec succès.",
      visitId: inserted.id,
      parentNotified,
    });
  } catch (error: any) {
    console.error("[Create Infirmary Visit Error]:", error);
    return mobileJsonError(error?.message || "Erreur enregistrement visite", 500);
  }
}
