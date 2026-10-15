import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getParentChildrenIds } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const childrenIds = await getParentChildrenIds(user);
    if (childrenIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rows = await readDb.query.students.findMany({
      where: inArray(students.id, childrenIds),
    });

    const data = rows.map((s) => ({
      id: s.id,
      school_id: s.schoolId,
      nom_etudiant: s.nomEtudiant,
      classe: s.classe,
      educational_level: s.educationalLevel,
      nom_pere: s.nomPere,
      mobile: s.mobile,
      whatsapp: s.whatsapp,
      num_admission: s.numAdmission,
      behavior_score: s.behaviorScore,
      photo_path: s.photoPath,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
