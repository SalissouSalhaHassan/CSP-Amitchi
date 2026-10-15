import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/infrastructure/database";
import { cahierTextes } from "@/infrastructure/database/schema/pedagogie";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { seanceId, status, inspectorRemarks } = body;

    if (!seanceId || !status) {
      return mobileJsonError("seanceId et status requis.", 400);
    }

    const now = new Date();
    const updated = await db
      .update(cahierTextes)
      .set({
        statut: status, // "Validé", "Rejeté", "En attente"
        valideParId: user.employeeId || null,
        valideAt: now,
        observation: inspectorRemarks || undefined,
        updatedAt: now,
      })
      .where(
        and(
          eq(cahierTextes.id, Number(seanceId)),
          user.schoolId ? eq(cahierTextes.schoolId, user.schoolId) : undefined
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        seanceId,
        statut: status,
        valideAt: now.toISOString(),
        inspectorName: (user as any).name || user.utilisateur || "Direction Pédagogique",
      },
    });
  } catch (error: any) {
    console.error("[Pedagogie Inspect API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de visa d'inspection", 500);
  }
}
