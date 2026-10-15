import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUnifiedFinancialReport } from "@/domains/finance/actions/finance.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const period = (searchParams.get("period") || "monthly") as "daily" | "monthly" | "yearly" | "all";
  const selectedDate = searchParams.get("selectedDate") || new Date().toISOString().split("T")[0];
  const level = searchParams.get("level") || undefined;
  const schoolIdParam = searchParams.get("schoolId");
  const schoolId = schoolIdParam ? parseInt(schoolIdParam, 10) : (user.schoolId || 9);

  try {
    const reportResult = await getUnifiedFinancialReport({
      period,
      selectedDate,
      educationalLevel: level && level !== "Tous" ? level : undefined,
      schoolId: isNaN(schoolId) ? (user.schoolId || 9) : schoolId,
    });

    if (reportResult && reportResult.success) {
      return NextResponse.json({
        success: true,
        data: reportResult.data,
      });
    }

    return mobileJsonError(reportResult?.error || "Erreur lors du calcul du rapport financier", 500);
  } catch (err: any) {
    console.error("[Mobile Unified Report API Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
