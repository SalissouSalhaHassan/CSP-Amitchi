import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { db } from "@/infrastructure/database";
import { hostelExitPermissions, hostelAllocations } from "@/infrastructure/database/schema/hostel";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;

  try {
    const body = await request.json();
    const {
      studentId,
      permissionType,
      departureDate,
      returnDateExpected,
      guardianName,
      guardianPhone,
      reason,
    } = body;

    if (!studentId || !departureDate || !returnDateExpected || !reason) {
      return NextResponse.json(
        { success: false, error: "Informations requises manquantes" },
        { status: 400 }
      );
    }

    // Find student's room
    const alloc = await db.query.hostelAllocations.findFirst({
      where: and(
        eq(hostelAllocations.schoolId, schoolId),
        eq(hostelAllocations.studentId, Number(studentId)),
        eq(hostelAllocations.status, "Occupé")
      ),
    });

    const [inserted] = await db
      .insert(hostelExitPermissions)
      .values({
        schoolId,
        studentId: Number(studentId),
        roomId: alloc?.roomId || null,
        permissionType: permissionType || "Sortie weekend",
        departureDate,
        returnDateExpected,
        guardianName: guardianName || user.nomPrenom || "Parent",
        guardianPhone: guardianPhone || (user as any).mobile || null,
        reason,
        status: "En attente",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted,
      message: "Demande de sortie transmise avec succès à l'administration de l'internat.",
    });
  } catch (error: any) {
    console.error("[Mobile Apply Exit Permission Error]:", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
