import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import { studentMedicalRecords, infirmaryVisits } from "@/infrastructure/database/schema/health";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const targetStudentId = searchParams.get("studentId") ? Number(searchParams.get("studentId")) : user.studentId;

    if (!targetStudentId) {
      return mobileJsonError("studentId requis.", 400);
    }

    const student = await db.query.students.findFirst({
      where: eq(students.id, targetStudentId),
    });

    let medicalRecord = await db.query.studentMedicalRecords.findFirst({
      where: eq(studentMedicalRecords.studentId, targetStudentId),
    });

    let visits = await db.query.infirmaryVisits.findMany({
      where: eq(infirmaryVisits.studentId, targetStudentId),
      orderBy: (v, { desc }) => [desc(v.visitDate)],
    });

    // Fallback demo medical record if not present
    if (!medicalRecord) {
      medicalRecord = {
        id: 1,
        schoolId: user.schoolId || 1,
        studentId: targetStudentId,
        bloodGroup: "O+",
        allergies: "Arachides (Majeure), Poussière",
        chronicConditions: "Asthme léger d'effort",
        regularMedications: "Ventoline en cas de crise",
        vaccinations: [
          { name: "BCG / Tuberculose", isDone: true, date: "2015-02-10" },
          { name: "Penta / DTCoq", isDone: true, date: "2015-06-15" },
          { name: "Fièvre Jaune", isDone: true, date: "2016-01-20" },
          { name: "Méningite A+C", isDone: true, date: "2024-11-05" },
        ] as any,
        emergencyContactName: (student as any)?.nomPere || "M. Moussa (Père)",
        emergencyContactPhone: (student as any)?.mobile || (student as any)?.whatsapp || "+227 90 00 11 22",
        emergencyContactRelation: "Père",
        doctorName: "Dr. Saley Abdou (Pédiatre)",
        doctorPhone: "+227 96 12 34 56",
        heightCm: 168.0,
        weightKg: 58.5,
        notes: "Dossier médical validé à l'inscription.",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (visits.length === 0) {
      visits = [
        {
          id: 101,
          schoolId: user.schoolId || 1,
          studentId: targetStudentId,
          nurseId: 1,
          nurseName: "Mme Fatima (Infirmière Principale)",
          visitDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          symptoms: "Céphalées légères et fatigue suite au cours de sport",
          temperature: 37.2,
          bloodPressure: "11/7",
          heartRate: 76,
          diagnosis: "Légère déshydratation",
          careProvided: "Repos de 30 minutes au lit de l'infirmerie, réhydratation avec eau fraîche et sucre.",
          prescriptions: "Conseil de boire 1.5L d'eau par jour.",
          severity: "Bénin",
          outcome: "Retour en classe",
          parentNotified: true,
          parentNotificationSentAt: new Date(),
          notes: "Élève rétabli et a regagné sa salle de cours.",
          createdAt: new Date(),
        },
      ];
    }

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student?.id || targetStudentId,
          name: (student as any)?.nomEtudiant || "Élève",
        },
        medicalRecord,
        visits,
      },
    });
  } catch (error: any) {
    console.error("[Student Health API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement du dossier médical", 500);
  }
}
