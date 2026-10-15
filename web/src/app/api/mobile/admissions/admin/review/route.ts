import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { reviewAdmissionApplicationAction } from "@/domains/admissions/actions/admissions.actions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request);
  if (!user) {
    return mobileJsonError("Non authentifié.", 401);
  }

  try {
    const body = await request.json();
    const { applicationId, decision, reviewNotes, assignedClass } = body;

    if (!applicationId || !decision) {
      return mobileJsonError("applicationId et decision sont requis.", 400);
    }

    const res = await reviewAdmissionApplicationAction({
      applicationId: Number(applicationId),
      decision,
      reviewNotes,
      assignedClass,
    });

    if (res?.error) {
      return mobileJsonError(res.error, 400);
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[Mobile Admissions Admin Review Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la décision", 500);
  }
}
