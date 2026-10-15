import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { behaviorRewards, disciplineIncidents } from "@/infrastructure/database/schema/discipline";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const { searchParams } = new URL(request.url);
  let className = searchParams.get("className");

  try {
    if (!className) {
      const firstStudent = await readDb.query.students.findFirst({
        where: and(eq(students.schoolId, schoolId), sql`${students.classe} IS NOT NULL`),
      });
      className = firstStudent?.classe || "6ème A";
    }

    const studentList = await readDb
      .select({
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        classe: students.classe,
        numAdmission: students.numAdmission,
        behaviorScore: students.behaviorScore,
        photoPath: students.photoPath,
      })
      .from(students)
      .where(
        and(
          eq(students.schoolId, schoolId),
          className ? eq(students.classe, className) : undefined
        )
      )
      .orderBy(students.nomEtudiant);

    const formattedStudents = studentList.map((s, idx) => ({
      id: s.id,
      name: s.nomEtudiant || `Élève ${idx + 1}`,
      classe: s.classe || className,
      matricule: s.numAdmission || `MAT-00${s.id}`,
      score: s.behaviorScore ?? 80,
      photoUrl: s.photoPath,
    }));

    return NextResponse.json({
      success: true,
      data: {
        className,
        studentsCount: formattedStudents.length,
        students: formattedStudents,
      },
    });
  } catch (error: any) {
    console.error("[Live Discipline GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement des élèves", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const teacherName = (user as any).name || user.utilisateur || "Enseignant";

  try {
    const body = await request.json();
    const { studentId, actionType, pointsEffect, reason, note } = body;

    if (!studentId || pointsEffect === undefined) {
      return mobileJsonError("studentId et pointsEffect requis.", 400);
    }

    const pts = Number(pointsEffect);
    const isMerit = pts >= 0;

    // 1. Update Student's behaviorScore
    await db
      .update(students)
      .set({
        behaviorScore: sql`GREATEST(0, LEAST(100, COALESCE(${students.behaviorScore}, 80) + ${pts}))`,
      })
      .where(eq(students.id, Number(studentId)));

    // 2. Record reward or incident
    if (isMerit) {
      await db.insert(behaviorRewards).values({
        studentId: Number(studentId),
        schoolId,
        rewardType: actionType || "Participation active ⭐",
        pointsEffect: pts,
        reason: reason || note || "Participation et engagement positif en classe.",
        grantedBy: teacherName,
      });
    } else {
      await db.insert(disciplineIncidents).values({
        studentId: Number(studentId),
        incidentType: actionType || "Remarque de comportement ⚠️",
        severity: Math.abs(pts) > 4 ? "Majeur" : "Mineur",
        description: reason || note || "Manquement aux règles de discipline en classe.",
        proposedAction: "Rappel à l'ordre & Retrait de points",
        status: "Enregistré",
        createdBy: teacherName,
      });
    }

    return NextResponse.json({
      success: true,
      message: isMerit
        ? `⭐ +${pts} points de mérite accordés avec succès !`
        : `⚠️ ${pts} points appliqués au score de comportement.`,
    });
  } catch (error: any) {
    console.error("[Live Discipline POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de l'enregistrement de l'action", 500);
  }
}
