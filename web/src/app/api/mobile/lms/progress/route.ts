import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { lmsProgress } from "@/infrastructure/database/schema/lms";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { lessonId, isCompleted, lastPosition, personalNotes, studentIdParam } = body;

    const studentId = studentIdParam ? Number(studentIdParam) : user.studentId;
    if (!studentId || !lessonId) {
      return mobileJsonError("studentId et lessonId sont requis.", 400);
    }

    const existingProgress = await db.query.lmsProgress.findFirst({
      where: and(
        eq(lmsProgress.studentId, studentId),
        eq(lmsProgress.lessonId, Number(lessonId))
      ),
    });

    if (existingProgress) {
      await db
        .update(lmsProgress)
        .set({
          isCompleted: isCompleted !== undefined ? isCompleted : existingProgress.isCompleted,
          completedAt: isCompleted ? new Date() : existingProgress.completedAt,
          lastPosition: lastPosition !== undefined ? lastPosition : existingProgress.lastPosition,
          personalNotes: personalNotes !== undefined ? personalNotes : existingProgress.personalNotes,
        })
        .where(eq(lmsProgress.id, existingProgress.id));
    } else {
      await db.insert(lmsProgress).values({
        studentId,
        lessonId: Number(lessonId),
        isCompleted: isCompleted || false,
        completedAt: isCompleted ? new Date() : null,
        lastPosition: lastPosition || 0,
        personalNotes: personalNotes || null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Progression enregistrée avec succès.",
    });
  } catch (error: any) {
    console.error("[LMS Progress Error]:", error);
    return mobileJsonError(error?.message || "Erreur de sauvegarde de progression", 500);
  }
}
