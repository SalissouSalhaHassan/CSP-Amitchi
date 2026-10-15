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
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query")?.toLowerCase().trim() || "";

    let schools = schoolsRes.data;

    if (query) {
      schools = schools.filter((s) => {
        return (
          s.name.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query) ||
          s.commune.toLowerCase().includes(query) ||
          s.region.toLowerCase().includes(query) ||
          s.department.toLowerCase().includes(query) ||
          s.inspection.toLowerCase().includes(query)
        );
      });
    }

    return NextResponse.json({
      success: true,
      roleType,
      schools,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
