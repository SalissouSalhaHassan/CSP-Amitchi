import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { classSubjects } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const studentId = Number(params.id);
  if (!studentId) {
    return mobileJsonError("studentId manquant ou invalide", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    const student = await readDb.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable", 404);
    }

    // 1. Enforce schoolId boundary
    if (schoolId && student.schoolId !== schoolId) {
      return mobileJsonError("Accès refusé. Cet élève appartient à un autre établissement.", 403);
    }

    // 2. Enforce role scope
    if (roleType === "parent" || roleType === "eleve") {
      const isLinked = await verifyParentChildRelationship(user, studentId);
      if (!isLinked) {
        return mobileJsonError("Accès refusé. Vous n'êtes pas autorisé à voir ce dossier.", 403);
      }
    } else if (roleType === "teacher" || roleType === "enseignant") {
      // Teachers must teach this student's class
      if (student.classe) {
        const hasAssignment = await readDb.query.classSubjects.findFirst({
          where: eq(classSubjects.employeeId, user.employeeId || 0),
          with: {
            class: true
          }
        });
        // Check if teacher is assigned to any class named student.classe
        const teachingAssignments = await readDb.query.classSubjects.findMany({
          where: eq(classSubjects.employeeId, user.employeeId || 0),
          with: { class: true }
        });
        const allowedClasses = new Set(teachingAssignments.map((a) => a.class?.className));
        if (!allowedClasses.has(student.classe)) {
          return mobileJsonError("Accès refusé. Vous n'enseignez pas dans la classe de cet élève.", 403);
        }
      } else {
        return mobileJsonError("Accès refusé. Cet élève n'est inscrit dans aucune classe.", 403);
      }
    }

    const data = {
      id: student.id,
      school_id: student.schoolId,
      num_admission: student.numAdmission,
      nom_etudiant: student.nomEtudiant,
      nom_arabe: student.nomArabe,
      sexe: student.sexe,
      religion: student.religion,
      date_naissance: student.dateNaissance,
      lieu_naissance: student.lieuNaissance,
      cnic: student.cnic,
      groupe_sanguin: student.groupeSanguin,
      session: student.session,
      educational_level: student.educationalLevel,
      classe: student.classe,
      section: student.section,
      categorie: student.categorie,
      nom_pere: student.nomPere,
      cnic_pere: student.cnicPere,
      mobile: student.mobile,
      whatsapp: student.whatsapp,
      frais_mensuels: student.fraisMensuels,
      ancien_solde: student.ancienSolde,
      frais_inscription: student.fraisInscription,
      statut: student.statut,
      behavior_score: student.behaviorScore,
      photo_path: student.photoPath,
      created_at: student.createdAt?.toISOString() || null,
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
