import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { teacherCommSettings } from "@/infrastructure/database/schema/messaging";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const employeeId = user.employeeId || 1;

  try {
    const settings = await readDb
      .select()
      .from(teacherCommSettings)
      .where(eq(teacherCommSettings.employeeId, employeeId))
      .limit(1);

    const defaultCannedResponses = [
      "Bien reçu, merci pour votre signalement.",
      "Je ferai le point avec l'élève dès demain en classe.",
      "Veuillez contacter l'administration de l'établissement pour cette démarche.",
      "L'élève a bien progressé et fait preuve d'un excellent investissement cette semaine.",
      "Un devoir de rattrapage sera organisé lors de la prochaine séance.",
    ];

    if (settings.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          dndEnabled: true,
          dndStartHour: "17:00",
          dndEndHour: "07:30",
          dndWeekends: true,
          autoReplyMessage: "Bonjour. Le professeur est actuellement hors de ses heures de disponibilité scolaire. Votre message sera traité dès la reprise des cours.",
          cannedResponses: defaultCannedResponses,
        },
      });
    }

    const row = settings[0];
    let cannedList: string[] = defaultCannedResponses;
    if (row.cannedResponses) {
      try {
        cannedList = JSON.parse(row.cannedResponses);
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        dndEnabled: row.dndEnabled,
        dndStartHour: row.dndStartHour,
        dndEndHour: row.dndEndHour,
        dndWeekends: row.dndWeekends,
        autoReplyMessage: row.autoReplyMessage,
        cannedResponses: cannedList,
      },
    });
  } catch (error: any) {
    console.error("[Teacher Comm Protection GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement des paramètres", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const employeeId = user.employeeId || 1;

  try {
    const body = await request.json();
    const { dndEnabled, dndStartHour, dndEndHour, dndWeekends, autoReplyMessage, cannedResponses } = body;

    const existing = await readDb
      .select({ id: teacherCommSettings.id })
      .from(teacherCommSettings)
      .where(eq(teacherCommSettings.employeeId, employeeId))
      .limit(1);

    const cannedStr = cannedResponses ? JSON.stringify(cannedResponses) : undefined;

    if (existing.length > 0) {
      await db
        .update(teacherCommSettings)
        .set({
          dndEnabled: dndEnabled ?? true,
          dndStartHour: dndStartHour ?? "17:00",
          dndEndHour: dndEndHour ?? "07:30",
          dndWeekends: dndWeekends ?? true,
          autoReplyMessage: autoReplyMessage ?? "Bonjour. Le professeur est actuellement hors de ses heures de disponibilité scolaire.",
          cannedResponses: cannedStr,
          updatedAt: new Date(),
        })
        .where(eq(teacherCommSettings.id, existing[0].id));
    } else {
      await db.insert(teacherCommSettings).values({
        schoolId,
        employeeId,
        dndEnabled: dndEnabled ?? true,
        dndStartHour: dndStartHour ?? "17:00",
        dndEndHour: dndEndHour ?? "07:30",
        dndWeekends: dndWeekends ?? true,
        autoReplyMessage: autoReplyMessage ?? "Bonjour. Le professeur est actuellement hors de ses heures de disponibilité scolaire.",
        cannedResponses: cannedStr,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Paramètres de protection et réponses rapides enregistrés avec succès !",
    });
  } catch (error: any) {
    console.error("[Teacher Comm Protection POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'enregistrement", 500);
  }
}
