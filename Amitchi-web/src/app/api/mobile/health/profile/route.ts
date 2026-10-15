import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { studentMedicalRecords } from "@/infrastructure/database/schema/health";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  try {
    const body = await request.json();
    const {
      studentId,
      bloodGroup,
      allergies,
      chronicConditions,
      regularMedications,
      vaccinations,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      doctorName,
      doctorPhone,
      heightCm,
      weightKg,
      notes,
    } = body;

    if (!studentId) {
      return mobileJsonError("studentId manquant.", 400);
    }

    const sId = Number(studentId);

    const existing = await db.query.studentMedicalRecords.findFirst({
      where: eq(studentMedicalRecords.studentId, sId),
    });

    if (existing) {
      await db
        .update(studentMedicalRecords)
        .set({
          bloodGroup: bloodGroup || null,
          allergies: allergies || null,
          chronicConditions: chronicConditions || null,
          regularMedications: regularMedications || null,
          vaccinations: vaccinations || null,
          emergencyContactName: emergencyContactName || null,
          emergencyContactPhone: emergencyContactPhone || null,
          emergencyContactRelation: emergencyContactRelation || null,
          doctorName: doctorName || null,
          doctorPhone: doctorPhone || null,
          heightCm: heightCm ? Number(heightCm) : null,
          weightKg: weightKg ? Number(weightKg) : null,
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(eq(studentMedicalRecords.id, existing.id));
    } else {
      await db.insert(studentMedicalRecords).values({
        schoolId: user.schoolId || 1,
        studentId: sId,
        bloodGroup: bloodGroup || null,
        allergies: allergies || null,
        chronicConditions: chronicConditions || null,
        regularMedications: regularMedications || null,
        vaccinations: vaccinations || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
        doctorName: doctorName || null,
        doctorPhone: doctorPhone || null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
        notes: notes || null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Fiche médicale mise à jour avec succès.",
    });
  } catch (error: any) {
    console.error("[Update Health Profile Error]:", error);
    return mobileJsonError(error?.message || "Erreur mise à jour profil médical", 500);
  }
}
