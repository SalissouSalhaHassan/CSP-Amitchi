import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { fetchDocumentHeaderConfigForSchool } from "@/domains/settings/actions/settings.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  if (!schoolId) {
    return mobileJsonError("Établissement non configuré pour cet utilisateur", 400);
  }

  try {
    const config = await fetchDocumentHeaderConfigForSchool(schoolId);
    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Erreur serveur"
    }, { status: 500 });
  }
}
