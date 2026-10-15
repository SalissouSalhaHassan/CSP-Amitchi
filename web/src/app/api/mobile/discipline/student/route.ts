import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { readDb } from "@/infrastructure/database";
import {
  disciplineIncidents,
  disciplinaryCouncils,
  parentConvocations,
  behaviorRewards,
} from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("studentId");
  const studentId = studentIdParam ? Number(studentIdParam) : (user as any).studentId;

  if (!studentId) {
    return mobileJsonError("studentId manquant.", 400);
  }

  try {
    const student = await readDb.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const [incidents, councils, convocations, rewards] = await Promise.all([
      readDb.query.disciplineIncidents.findMany({
        where: eq(disciplineIncidents.studentId, studentId),
        orderBy: [desc(disciplineIncidents.date)],
        limit: 30,
      }),
      readDb.query.disciplinaryCouncils.findMany({
        where: eq(disciplinaryCouncils.studentId, studentId),
        orderBy: [desc(disciplinaryCouncils.sessionDate)],
        limit: 10,
      }),
      readDb.query.parentConvocations.findMany({
        where: eq(parentConvocations.studentId, studentId),
        orderBy: [desc(parentConvocations.convocationDate)],
        limit: 10,
      }),
      readDb.query.behaviorRewards.findMany({
        where: eq(behaviorRewards.studentId, studentId),
        orderBy: [desc(behaviorRewards.createdAt)],
        limit: 20,
      }),
    ]);

    // Check if there is an active urgent alert (Convocation pending or Council scheduled)
    const hasPendingConvocation = convocations.some((c) => c.status === "Envoyé");
    const hasActiveCouncil = councils.some((c) => c.status === "Programmé");

    const behaviorScore = student.behaviorScore ?? 20;
    let conductAppraisal = "Excellent comportement ✨";
    if (behaviorScore < 10) {
      conductAppraisal = "Comportement très préoccupant 🚨";
    } else if (behaviorScore < 14) {
      conductAppraisal = "Comportement à améliorer ⚠️";
    } else if (behaviorScore < 17) {
      conductAppraisal = "Bon comportement 👍";
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.nomEtudiant,
          class: student.classe,
          admissionNo: student.numAdmission,
          behaviorScore,
          conductAppraisal,
        },
        hasPendingConvocation,
        hasActiveCouncil,
        pendingConvocation: hasPendingConvocation ? convocations.find((c) => c.status === "Envoyé") : null,
        activeCouncil: hasActiveCouncil ? councils.find((c) => c.status === "Programmé") : null,
        incidents,
        councils,
        convocations,
        rewards,
      },
    });
  } catch (error: any) {
    console.error("[Discipline API Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur discipline", 500);
  }
}
