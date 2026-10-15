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
    const alerts: { school: string; code: string; type: string; severity: "critical" | "warning" }[] = [];

    schools.forEach((s) => {
      if (!s.eau && !s.electricite) {
        alerts.push({ school: s.name, code: s.code, type: "Manque d'eau et d'électricité critiques", severity: "critical" });
      } else if (!s.eau) {
        alerts.push({ school: s.name, code: s.code, type: "Absence d'alimentation en eau potable", severity: "warning" });
      } else if (!s.electricite) {
        alerts.push({ school: s.name, code: s.code, type: "Pas d'électricité fonctionnelle", severity: "warning" });
      }

      if (!s.latrines) {
        alerts.push({ school: s.name, code: s.code, type: "Absence de latrines opérationnelles", severity: "critical" });
      }

      if (s.manqueEnseignants > 2) {
        alerts.push({ school: s.name, code: s.code, type: `Déficit de ${s.manqueEnseignants} enseignants`, severity: "critical" });
      }

      if (s.abandonRate > 8) {
        alerts.push({ school: s.name, code: s.code, type: `Taux d'abandon élevé (${s.abandonRate}%)`, severity: "critical" });
      }

      if (s.completion < 60) {
        alerts.push({ school: s.name, code: s.code, type: `Fiche canevas incomplète (${s.completion}%)`, severity: "warning" });
      }
    });

    return NextResponse.json({
      success: true,
      roleType,
      alerts,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Erreur serveur" }, { status: 500 });
  }
}
