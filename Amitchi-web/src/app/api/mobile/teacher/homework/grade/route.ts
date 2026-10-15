import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { submissionId, score, feedback } = body;

    if (!submissionId) {
      return mobileJsonError("submissionId obligatoire.", 400);
    }

    const sId = Number(submissionId);
    const scoreVal = Number(score || 0);
    const graderName = (user as any).name || (user as any).email || user.utilisateur || "Professeur";

    await db.execute(sql`
      UPDATE homework_submissions
      SET score = ${scoreVal},
          feedback = ${feedback || ""},
          status = 'Noté',
          graded_at = NOW(),
          graded_by = ${graderName}
      WHERE id = ${sId}
    `);

    return NextResponse.json({
      success: true,
      message: "Note et appréciation enregistrées avec succès !",
    });
  } catch (error: any) {
    console.error("[Homework Grade POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur de notation", 500);
  }
}
