import { NextRequest, NextResponse } from "next/server";
import { runAISolver } from "@/domains/academics/actions/timetable.actions";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const {
      classId,
      sessionId,
      strategy = "balanced",
      maxConsecutiveHours = 2,
      respectTeacherConstraints = true,
      overwriteExisting = true,
    } = body;

    const result = await runAISolver({
      classId: classId ? Number(classId) : undefined,
      sessionId: sessionId ? Number(sessionId) : undefined,
      strategy,
      maxConsecutiveHours: Number(maxConsecutiveHours) || 2,
      respectTeacherConstraints: Boolean(respectTeacherConstraints),
      overwriteExisting: Boolean(overwriteExisting),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Mobile AI Timetable Solver Error]:", error);
    return mobileJsonError(error?.message || "Erreur de génération automatique de l'emploi du temps", 500);
  }
}
