import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import { surveyResponses } from "@/infrastructure/database/schema/front_office";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      overallRating = 5,
      teachingQualityRating = 5,
      transportRating = 5,
      canteenRating = 5,
      cleanlinessRating = 5,
      comment = "",
    } = body;

    const schoolId = user.schoolId || 1;

    const [inserted] = await db
      .insert(surveyResponses)
      .values({
        schoolId,
        respondentName: (user as any).nomPrenom || (user as any).name || user.utilisateur || "Parent d'élève",
        respondentRole: (user as any).role?.roleName || (user as any).role || "Parent",
        overallRating: Math.min(5, Math.max(1, Number(overallRating))),
        teachingQualityRating: Math.min(5, Math.max(1, Number(teachingQualityRating))),
        transportRating: Math.min(5, Math.max(1, Number(transportRating))),
        canteenRating: Math.min(5, Math.max(1, Number(canteenRating))),
        cleanlinessRating: Math.min(5, Math.max(1, Number(cleanlinessRating))),
        comment: comment?.toString().trim() || null,
      })
      .returning({ id: surveyResponses.id });

    return NextResponse.json({
      success: true,
      message: "Merci infiniment ! Votre avis a été enregistré avec succès et transmis à la direction.",
      data: { responseId: inserted.id },
    });
  } catch (error: any) {
    console.error("[Submit Feedback API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de l'enregistrement de votre avis.", 500);
  }
}
