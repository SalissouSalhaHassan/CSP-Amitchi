import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { homeworkSubmissions } from "@/infrastructure/database/schema/homework";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      homeworkId,
      studentId = user.studentId,
      submissionText = "",
      submissionAttachment = null,
      voiceNoteUrl = null,
    } = body;

    if (!homeworkId || !studentId) {
      return mobileJsonError("homeworkId et studentId requis.", 400);
    }

    const [sub] = await db
      .insert(homeworkSubmissions)
      .values({
        homeworkId: Number(homeworkId),
        studentId: Number(studentId),
        submissionText: submissionText?.toString().trim() || null,
        submissionAttachment: submissionAttachment?.toString().trim() || null,
        voiceNoteUrl: voiceNoteUrl?.toString().trim() || null,
        status: "Rendu",
      })
      .returning({ id: homeworkSubmissions.id });

    return NextResponse.json({
      success: true,
      message: "Votre devoir a été transmis à votre enseignant avec succès !",
      data: {
        submissionId: sub.id,
        status: "Rendu",
        submittedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Submit Homework API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la remise du devoir", 500);
  }
}
