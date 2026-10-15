import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { getAdmissionApplicationsList } from "@/domains/admissions/actions/admissions.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request);
  if (!user) {
    return mobileJsonError("Non authentifié.", 401);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ALL";
    const targetClass = searchParams.get("targetClass") || "ALL";
    const query = searchParams.get("query") || "";

    const res = await getAdmissionApplicationsList({ status, targetClass, query });
    const applications = (res as any)?.data?.applications || (res as any)?.applications || [];
    return NextResponse.json({
      success: true,
      data: applications,
    });
  } catch (error: any) {
    console.error("[Mobile Admissions Admin List Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur", 500);
  }
}
