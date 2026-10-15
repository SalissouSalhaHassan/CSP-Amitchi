import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { recordStudentBoardingAction } from "@/domains/transport/actions/transport.actions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  try {
    const body = await request.json();
    const { studentId, tripId, subscriptionId, eventType, stopName } = body;

    if (!studentId || !eventType) {
      return mobileJsonError("studentId et eventType sont requis.", 400);
    }

    const res = await recordStudentBoardingAction({
      studentId: Number(studentId),
      tripId: tripId ? Number(tripId) : undefined,
      subscriptionId: subscriptionId ? Number(subscriptionId) : undefined,
      eventType,
      stopName: stopName || "Arrêt désigné",
      scannedBy: (user as any).name || (user as any).nom || user.utilisateur || "Surveillant",
      notifyParent: true,
    });

    if (res?.error) {
      return mobileJsonError(res.error, 400);
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[Mobile Transport Board Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors du pointage", 500);
  }
}
