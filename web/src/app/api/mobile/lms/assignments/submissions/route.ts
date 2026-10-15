import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { db } from "@/infrastructure/database";
import { lmsSubmissions, lmsAssignments } from "@/infrastructure/database/schema/lms";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignmentId")
      ? Number(searchParams.get("assignmentId"))
      : null;

    if (!assignmentId) {
      return mobileJsonError("Paramètre assignmentId manquant", 400);
    }

    const submissions = await db.query.lmsSubmissions.findMany({
      where: eq(lmsSubmissions.assignmentId, assignmentId),
      with: {
        student: true,
        assignment: true,
      },
      orderBy: [desc(lmsSubmissions.submittedAt)],
    });

    const enriched = submissions.map((s) => ({
      id: s.id,
      assignmentId: s.assignmentId,
      studentId: s.studentId,
      studentName: s.student?.nomEtudiant || "Élève",
      matricule: s.student?.numAdmission || "",
      score: s.score,
      comment: s.comment,
      isGraded: s.isGraded,
      fileReponsePath: s.fileReponsePath,
      submittedAt: s.submittedAt,
      maxScore: s.assignment?.maxScore ?? 20,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (e: any) {
    console.error("[LMS Submissions GET Error]:", e);
    return mobileJsonError(e?.message || "Erreur serveur", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const submissionId = Number(body.submissionId);
    const score = Number(body.score);
    const comment = body.comment?.toString().trim() || "";

    if (!submissionId || isNaN(score)) {
      return mobileJsonError("submissionId et score valide requis", 400);
    }

    await db
      .update(lmsSubmissions)
      .set({
        score,
        comment,
        isGraded: true,
      })
      .where(eq(lmsSubmissions.id, submissionId));

    return NextResponse.json({
      success: true,
      message: "Copie notée et enregistrée avec succès !",
    });
  } catch (e: any) {
    console.error("[LMS Submissions POST Error]:", e);
    return mobileJsonError(e?.message || "Erreur lors de la notation", 500);
  }
}
