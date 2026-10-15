import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { getMinistrySchoolsDataForUser } from "@/domains/ministry/actions/ministry.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const roleType = await getUserRoleType(user);
  if (!["super_admin", "ministere", "dren", "dden", "inspection"].includes(roleType)) {
    return mobileJsonError("Accès refusé. Rôle ministère/inspection requis.", 403);
  }

  try {
    const schoolsRes = await getMinistrySchoolsDataForUser(user);
    const schools = schoolsRes.data;
  const totalSchools = schools.length;
  let totalEleves = 0;
  let totalFilles = 0;
  let totalGarcons = 0;
  let totalEnseignants = 0;
  let sumSuccess = 0;
  let sumAttendance = 0;
  let sumCompletion = 0;
  let noWater = 0;
  let noElec = 0;
  let noLatrines = 0;
  let priorityZones = 0;

  schools.forEach((s) => {
    totalEleves += s.eleves;
    totalFilles += s.filles;
    totalGarcons += s.garcons;
    totalEnseignants += s.enseignants;
    sumSuccess += s.successRate;
    sumAttendance += s.attendanceRate;
    sumCompletion += s.completion;
    if (!s.eau) noWater++;
    if (!s.electricite) noElec++;
    if (!s.latrines) noLatrines++;
    if (s.successRate < 65 || !s.eau || !s.electricite || s.abandonRate > 8) {
      priorityZones++;
    }
  });

  const pupilTeacherRatio = totalEnseignants > 0 ? Number((totalEleves / totalEnseignants).toFixed(1)) : 0;
  const avgSuccess = totalSchools > 0 ? Number((sumSuccess / totalSchools).toFixed(1)) : 0;
  const avgAttendance = totalSchools > 0 ? Number((sumAttendance / totalSchools).toFixed(1)) : 0;
  const avgCompletion = totalSchools > 0 ? Number((sumCompletion / totalSchools).toFixed(0)) : 0;

  return NextResponse.json({
    success: true,
    roleType,
    summary: {
      totalSchools,
      totalEleves,
      totalFilles,
      totalGarcons,
      totalEnseignants,
      pupilTeacherRatio,
      avgSuccess,
      avgAttendance,
      avgCompletion,
      noWater,
      noElec,
      noLatrines,
      priorityZones,
    }
  });
} catch (e: any) {
  return NextResponse.json({ success: false, error: e.message || "Erreur serveur" }, { status: 500 });
}
}
