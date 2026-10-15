import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { pedagogiePlanification } from "@/infrastructure/database/schema/pedagogie";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const classId = Number(searchParams.get("classId"));
  const subjectId = Number(searchParams.get("subjectId"));
  const typePlan = searchParams.get("typePlan");
  const statut = searchParams.get("statut");

  try {
    const schoolId = user.schoolId || 1;

    let query = readDb
      .select({
        id: pedagogiePlanification.id,
        school_id: pedagogiePlanification.schoolId,
        class_id: pedagogiePlanification.classId,
        subject_id: pedagogiePlanification.subjectId,
        employee_id: pedagogiePlanification.employeeId,
        type_plan: pedagogiePlanification.typePlan,
        periode: pedagogiePlanification.periode,
        chapitre: pedagogiePlanification.chapitre,
        lecon_prevue: pedagogiePlanification.leconPrevue,
        competence_visee: pedagogiePlanification.competenceVisee,
        date_prevue: pedagogiePlanification.datePrevue,
        statut: pedagogiePlanification.statut,
        observation: pedagogiePlanification.observation,
        annee_scolaire: pedagogiePlanification.anneeScolaire,
        created_at: pedagogiePlanification.createdAt,
        updated_at: pedagogiePlanification.updatedAt,
        school_classes: {
          id: schoolClasses.id,
          class_name: schoolClasses.className,
          className: schoolClasses.className,
        },
        school_subjects: {
          id: schoolSubjects.id,
          subject_name: schoolSubjects.subjectName,
          subjectName: schoolSubjects.subjectName,
        },
      })
      .from(pedagogiePlanification)
      .leftJoin(schoolClasses, eq(schoolClasses.id, pedagogiePlanification.classId))
      .leftJoin(schoolSubjects, eq(schoolSubjects.id, pedagogiePlanification.subjectId))
      .where(
        and(
          eq(pedagogiePlanification.schoolId, schoolId),
          classId ? eq(pedagogiePlanification.classId, classId) : undefined,
          subjectId ? eq(pedagogiePlanification.subjectId, subjectId) : undefined,
          typePlan ? eq(pedagogiePlanification.typePlan, typePlan) : undefined,
          statut ? eq(pedagogiePlanification.statut, statut) : undefined
        )
      )
      .orderBy(desc(pedagogiePlanification.id));

    const rows = await query;

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("[Planifications GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement des planifications", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      classId,
      subjectId,
      typePlan,
      chapitre,
      leconPrevue,
      periode,
      competenceVisee,
      datePrevue,
      statut,
      observation,
      anneeScolaire,
    } = body;

    if (!classId || !subjectId || !chapitre || !leconPrevue) {
      return mobileJsonError("Classe, matière, chapitre et leçon prévue requis.", 400);
    }

    const schoolId = user.schoolId || 1;
    const employeeId = user.employeeId || null;

    const inserted = await db
      .insert(pedagogiePlanification)
      .values({
        schoolId,
        classId: Number(classId),
        subjectId: Number(subjectId),
        employeeId,
        typePlan: typePlan || "Annuel",
        chapitre,
        leconPrevue,
        periode: periode || null,
        competenceVisee: competenceVisee || null,
        datePrevue: datePrevue ? String(datePrevue).split("T")[0] : null,
        statut: statut || "Planifié",
        observation: observation || null,
        anneeScolaire: anneeScolaire || "2025-2026",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted[0],
      message: "Planification enregistrée avec succès.",
    });
  } catch (error: any) {
    console.error("[Planifications POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'enregistrement de la planification", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      id,
      typePlan,
      chapitre,
      leconPrevue,
      periode,
      competenceVisee,
      datePrevue,
      statut,
      observation,
    } = body;

    if (!id) {
      return mobileJsonError("ID requis pour la mise à jour.", 400);
    }

    const updated = await db
      .update(pedagogiePlanification)
      .set({
        typePlan: typePlan || undefined,
        chapitre: chapitre || undefined,
        leconPrevue: leconPrevue || undefined,
        periode: periode !== undefined ? periode : undefined,
        competenceVisee: competenceVisee !== undefined ? competenceVisee : undefined,
        datePrevue: datePrevue !== undefined ? (datePrevue ? String(datePrevue).split("T")[0] : null) : undefined,
        statut: statut || undefined,
        observation: observation !== undefined ? observation : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pedagogiePlanification.id, Number(id)),
          user.schoolId ? eq(pedagogiePlanification.schoolId, user.schoolId) : undefined
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: "Planification mise à jour avec succès.",
    });
  } catch (error: any) {
    console.error("[Planifications PUT Error]:", error);
    return mobileJsonError(error?.message || "Erreur de mise à jour", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const id = Number(searchParams.get("id"));

  if (!id) {
    return mobileJsonError("ID requis pour suppression.", 400);
  }

  try {
    await db
      .delete(pedagogiePlanification)
      .where(
        and(
          eq(pedagogiePlanification.id, id),
          user.schoolId ? eq(pedagogiePlanification.schoolId, user.schoolId) : undefined
        )
      );

    return NextResponse.json({
      success: true,
      message: "Planification supprimée.",
    });
  } catch (error: any) {
    console.error("[Planifications DELETE Error]:", error);
    return mobileJsonError(error?.message || "Erreur de suppression", 500);
  }
}
