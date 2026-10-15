import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import { infirmaryVisits } from "@/infrastructure/database/schema/health";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      studentId,
      symptoms,
      temperature = 37.0,
      bloodPressure,
      diagnosis,
      careProvided,
      prescriptions,
      severity = "Normal",
      outcome = "Retour en classe",
      notifyParent = true,
    } = body;

    if (!studentId || !symptoms) {
      return mobileJsonError("studentId et symptoms requis.", 400);
    }

    const schoolId = user.schoolId || 1;

    // 1. Fetch student
    const student = await db.query.students.findFirst({
      where: eq(students.id, Number(studentId)),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const studentName = (student as any).nomEtudiant || "l'élève";
    const parentPhone = (student as any).whatsapp || (student as any).parentWhatsapp || (student as any).mobile;

    // 2. Insert Infirmary Visit
    const [visit] = await db
      .insert(infirmaryVisits)
      .values({
        schoolId,
        studentId: Number(studentId),
        nurseName: (user as any).nomPrenom || (user as any).name || user.utilisateur || "Infirmière Scolaire",
        symptoms,
        temperature: Number(temperature),
        bloodPressure,
        diagnosis,
        careProvided,
        prescriptions,
        severity,
        outcome,
        parentNotified: notifyParent,
        parentNotificationSentAt: notifyParent ? new Date() : null,
      })
      .returning({ id: infirmaryVisits.id });

    // 3. Dispatch Emergency WhatsApp notification if urgent or requested
    if (notifyParent && parentPhone) {
      const waMsg = `🩺 *Avis Infirmerie Scolaire Edut*\nBonjour M./Mme, votre enfant *${studentName}* a été admis à l'infirmerie ce jour pour : "${symptoms}".\n• Température : ${temperature}°C\n• Soins administrés : ${careProvided || "Soins de première urgence"}\n• Décision : *${outcome}*.\nL'équipe médicale reste joignable pour tout complément d'information.`;

      try {
        await fetch(`${request.nextUrl.origin}/api/mobile/whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: parentPhone,
            message: waMsg,
            schoolId,
          }),
        });
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: "Visite médicale enregistrée et notifiée au parent.",
      data: { visitId: visit.id },
    });
  } catch (error: any) {
    console.error("[Health Visit API Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'enregistrement de la visite médicale", 500);
  }
}
