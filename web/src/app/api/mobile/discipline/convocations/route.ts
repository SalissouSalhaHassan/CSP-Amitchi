import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { parentConvocations } from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";
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
      incidentId,
      reason,
      convocationDate,
      location = "Bureau du Censeur / Surveillant Général",
      channel = "WhatsApp",
      notes,
      notifyParent = true,
    } = body;

    if (!studentId || !reason || !convocationDate) {
      return mobileJsonError("studentId, reason et convocationDate sont obligatoires.", 400);
    }

    const student = await db.query.students.findFirst({
      where: eq(students.id, Number(studentId)),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const schoolId = user.schoolId || student.schoolId || 1;

    const [inserted] = await db
      .insert(parentConvocations)
      .values({
        schoolId,
        studentId: Number(studentId),
        incidentId: incidentId ? Number(incidentId) : null,
        reason,
        convocationDate: new Date(convocationDate),
        location,
        channel,
        status: "Envoyé",
        parentNotified: false,
        notes: notes || null,
      })
      .returning();

    let parentNotified = false;

    if (notifyParent) {
      const studentName = student.nomEtudiant || "l'élève";
      const parentPhone = (student as any)?.mobile || (student as any)?.whatsapp || (student as any)?.telephoneParent;

      if (parentPhone) {
        const dateFmt = new Date(convocationDate).toLocaleDateString("fr-FR", {
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
          reason,
          convocationDate: dateFmt,
          location,
          schoolName: "Edut Pro",
          sendSMS: true,
          sendWhatsApp: true,
        });
        parentNotified = true;

        await db
          .update(parentConvocations)
          .set({ parentNotified: true, parentNotificationSentAt: new Date() })
          .where(eq(parentConvocations.id, inserted.id));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Convocation du parent envoyée avec succès.",
      convocationId: inserted.id,
      parentNotified,
    });
  } catch (error: any) {
    console.error("[Create Parent Convocation Error]:", error);
    return mobileJsonError(error?.message || "Erreur convocation parent", 500);
  }
}
