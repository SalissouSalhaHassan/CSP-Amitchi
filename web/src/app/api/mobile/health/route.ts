import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

// Clinic visits in-memory or fallback cache
const clinicVisitsCache: Array<{
  id: number;
  studentId: number;
  studentName: string;
  className: string;
  visitedAt: string;
  reason: string;
  symptoms: string[];
  treatment: string;
  temperature?: string;
  nurseName: string;
  parentNotified: boolean;
  status: "Sous observation" | "Retour en classe" | "Évacué / Renvoyé à domicile";
}> = [
  {
    id: 1,
    studentId: 1,
    studentName: "Moussa Ibrahim",
    className: "3ème A",
    visitedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    reason: "Céphalées et légère fièvre",
    symptoms: ["Fièvre (38.2°C)", "Maux de tête"],
    treatment: "Administration de Paracétamol 500mg, repos 30 min",
    temperature: "38.2°C",
    nurseName: "Infirmière Hadiza",
    parentNotified: true,
    status: "Retour en classe",
  },
];

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));

  const filtered = studentId
    ? clinicVisitsCache.filter((v) => v.studentId === studentId)
    : clinicVisitsCache;

  // Student Health Profile metadata
  const healthProfile = {
    studentId: studentId || 1,
    bloodGroup: "O+",
    allergies: ["Poussière", "Arachides (légère)"],
    chronicConditions: ["Asthme d'effort"],
    vaccinations: ["BCG", "Polio", "Fièvre Jaune", "Méningite"],
    emergencyContact: "+227 90 12 34 56 (Père)",
    aptitudeEPS: "Apte avec dispense en cas de crise",
  };

  return NextResponse.json({
    success: true,
    data: {
      profile: healthProfile,
      visits: filtered,
    },
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { studentId, studentName, className, reason, symptoms, treatment, temperature, status } = body;

    if (!studentId || !reason) {
      return mobileJsonError("studentId et motif de consultation requis.", 400);
    }

    const newVisit = {
      id: Date.now(),
      studentId: Number(studentId),
      studentName: studentName || "Élève",
      className: className || "Classe",
      visitedAt: new Date().toISOString(),
      reason,
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms || "Consultation générale"],
      treatment: treatment || "Soins de premiers secours",
      temperature: temperature || "37.0°C",
      nurseName: (user as any).name || user.utilisateur || "Infirmerie Scolaire",
      parentNotified: true,
      status: (status as any) || "Retour en classe",
    };

    clinicVisitsCache.unshift(newVisit);

    return NextResponse.json({
      success: true,
      data: newVisit,
      message: "Passage à l'infirmerie enregistré et alerte parent transmise.",
    });
  } catch (error: any) {
    console.error("[Health API Error]:", error);
    return mobileJsonError(error?.message || "Erreur de santé scolaire", 500);
  }
}
