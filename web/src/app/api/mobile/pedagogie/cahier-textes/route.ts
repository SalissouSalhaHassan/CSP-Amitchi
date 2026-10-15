import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { cahierTextes } from "@/infrastructure/database/schema/pedagogie";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const classId = Number(searchParams.get("classId"));
  const subjectId = Number(searchParams.get("subjectId"));
  const statut = searchParams.get("statut");

  try {
    const schoolId = user.schoolId || 1;

    let query = readDb
      .select({
        id: cahierTextes.id,
        school_id: cahierTextes.schoolId,
        class_id: cahierTextes.classId,
        subject_id: cahierTextes.subjectId,
        employee_id: cahierTextes.employeeId,
        session_date: cahierTextes.sessionDate,
        heure_debut: cahierTextes.heureDebut,
        heure_fin: cahierTextes.heureFin,
        titre_lecon: cahierTextes.titreLecon,
        objectifs: cahierTextes.objectifs,
        contenu_realise: cahierTextes.contenuRealise,
        supports_utilises: cahierTextes.supportsUtilises,
        devoir_donne: cahierTextes.devoirDonne,
        observation: cahierTextes.observation,
        statut: cahierTextes.statut,
        valide_par_id: cahierTextes.valideParId,
        valide_at: cahierTextes.valideAt,
        annee_scolaire: cahierTextes.anneeScolaire,
        created_at: cahierTextes.createdAt,
        updated_at: cahierTextes.updatedAt,
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
      .from(cahierTextes)
      .leftJoin(schoolClasses, eq(schoolClasses.id, cahierTextes.classId))
      .leftJoin(schoolSubjects, eq(schoolSubjects.id, cahierTextes.subjectId))
      .where(
        and(
          eq(cahierTextes.schoolId, schoolId),
          classId ? eq(cahierTextes.classId, classId) : undefined,
          subjectId ? eq(cahierTextes.subjectId, subjectId) : undefined,
          statut ? eq(cahierTextes.statut, statut) : undefined
        )
      )
      .orderBy(desc(cahierTextes.sessionDate), desc(cahierTextes.id));

    const rows = await query;

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error: any) {
    console.error("[Cahier Textes GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement du cahier de textes", 500);
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
      sessionDate,
      titreLecon,
      heureDebut,
      heureFin,
      objectifs,
      contenuRealise,
      supportsUtilises,
      devoirDonne,
      observation,
      statut,
      anneeScolaire,
    } = body;

    if (!classId || !subjectId || !sessionDate || !titreLecon) {
      return mobileJsonError("Classe, matière, date et titre de leçon requis.", 400);
    }

    const schoolId = user.schoolId || 1;
    const employeeId = user.employeeId || null;

    const inserted = await db
      .insert(cahierTextes)
      .values({
        schoolId,
        classId: Number(classId),
        subjectId: Number(subjectId),
        employeeId,
        sessionDate: String(sessionDate).split("T")[0],
        titreLecon,
        heureDebut: heureDebut || null,
        heureFin: heureFin || null,
        objectifs: objectifs || null,
        contenuRealise: contenuRealise || null,
        supportsUtilises: supportsUtilises || null,
        devoirDonne: devoirDonne || null,
        observation: observation || null,
        statut: statut || "Brouillon",
        anneeScolaire: anneeScolaire || "2025-2026",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted[0],
      message: "Séance enregistrée avec succès dans le cahier de textes.",
    });
  } catch (error: any) {
    console.error("[Cahier Textes POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'enregistrement de la séance", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      id,
      titreLecon,
      sessionDate,
      heureDebut,
      heureFin,
      objectifs,
      contenuRealise,
      supportsUtilises,
      devoirDonne,
      observation,
      statut,
    } = body;

    if (!id) {
      return mobileJsonError("ID de séance requis.", 400);
    }

    const updated = await db
      .update(cahierTextes)
      .set({
        titreLecon: titreLecon || undefined,
        sessionDate: sessionDate ? String(sessionDate).split("T")[0] : undefined,
        heureDebut: heureDebut !== undefined ? heureDebut : undefined,
        heureFin: heureFin !== undefined ? heureFin : undefined,
        objectifs: objectifs !== undefined ? objectifs : undefined,
        contenuRealise: contenuRealise !== undefined ? contenuRealise : undefined,
        supportsUtilises: supportsUtilises !== undefined ? supportsUtilises : undefined,
        devoirDonne: devoirDonne !== undefined ? devoirDonne : undefined,
        observation: observation !== undefined ? observation : undefined,
        statut: statut || undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cahierTextes.id, Number(id)),
          user.schoolId ? eq(cahierTextes.schoolId, user.schoolId) : undefined
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: "Séance mise à jour avec succès.",
    });
  } catch (error: any) {
    console.error("[Cahier Textes PUT Error]:", error);
    return mobileJsonError(error?.message || "Erreur de modification de la séance", 500);
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
      .delete(cahierTextes)
      .where(
        and(
          eq(cahierTextes.id, id),
          user.schoolId ? eq(cahierTextes.schoolId, user.schoolId) : undefined
        )
      );

    return NextResponse.json({
      success: true,
      message: "Séance supprimée du cahier de textes.",
    });
  } catch (error: any) {
    console.error("[Cahier Textes DELETE Error]:", error);
    return mobileJsonError(error?.message || "Erreur de suppression", 500);
  }
}
