import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getTeachersPerformanceAudit } from "@/domains/pedagogie/actions/teacher-audit.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const auditRes = await getTeachersPerformanceAudit();
    if (!auditRes.success || !auditRes.data) {
      return mobileJsonError(auditRes.error || "Erreur chargement audit", 500);
    }

    // If teacher role, return their individual metric
    if (user.employeeId) {
      const myMetric = auditRes.data.teachers.find((t) => t.id === user.employeeId);
      return NextResponse.json({
        success: true,
        data: {
          summary: auditRes.data.summary,
          myMetric: myMetric || auditRes.data.teachers[0] || null,
        },
      });
    }

    // If admin or director, return full audit
    return NextResponse.json({
      success: true,
      data: auditRes.data,
    });
  } catch (err: any) {
    console.error("[Teacher Evaluations API Error]:", err);
    return mobileJsonError(err?.message || "Erreur serveur", 500);
  }
}
