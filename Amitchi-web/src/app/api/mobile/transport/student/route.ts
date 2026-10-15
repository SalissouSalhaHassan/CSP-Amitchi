import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { readDb } from "@/infrastructure/database";
import {
  transportSubscriptions,
  transportLiveTrips,
  transportBoardingLogs,
} from "@/infrastructure/database/schema/transport";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) {
    return response || mobileJsonError("Non authentifié.", 401);
  }

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("studentId");
  const studentId = studentIdParam ? Number(studentIdParam) : (user as any).studentId;

  if (!studentId) {
    return mobileJsonError("studentId manquant.", 400);
  }

  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    const [student, subscription] = await Promise.all([
      readDb.query.students.findFirst({
        where: eq(students.id, studentId),
      }),
      readDb.query.transportSubscriptions.findFirst({
        where: and(
          eq(transportSubscriptions.studentId, studentId),
          eq(transportSubscriptions.status, "Actif")
        ),
        with: {
          route: true,
        },
      }),
    ]);

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    if (!subscription) {
      return NextResponse.json({
        success: true,
        isSubscribed: false,
        student: {
          id: student.id,
          name: student.nomEtudiant,
          class: student.classe,
          admissionNo: student.numAdmission,
        },
        subscription: null,
        activeTrip: null,
        recentLogs: [],
      });
    }

    // Check active trip today for this student's line
    const activeTrip = await readDb.query.transportLiveTrips.findFirst({
      where: and(
        eq(transportLiveTrips.routeId, subscription.routeId),
        eq(transportLiveTrips.tripDate, todayStr),
        eq(transportLiveTrips.status, "En cours")
      ),
      orderBy: [desc(transportLiveTrips.createdAt)],
    });

    // Recent boarding logs for this student
    const recentLogs = await readDb.query.transportBoardingLogs.findMany({
      where: eq(transportBoardingLogs.studentId, studentId),
      orderBy: [desc(transportBoardingLogs.scanTime)],
      limit: 15,
    });

    return NextResponse.json({
      success: true,
      isSubscribed: true,
      student: {
        id: student.id,
        name: student.nomEtudiant,
        class: student.classe,
        admissionNo: student.numAdmission,
      },
      subscription: {
        id: subscription.id,
        routeName: subscription.route?.routeName,
        vehicleNumber: subscription.route?.vehicleNumber,
        driverName: subscription.route?.driverName,
        driverPhone: subscription.route?.driverPhone,
        pickupStop: subscription.pickupStop || subscription.pickupPoint || "Arrêt Principal",
        dropoffStop: subscription.dropoffStop || "École",
        tripType: subscription.tripType || "Aller-Retour",
        stops: (subscription.route?.stops as any[]) || [],
      },
      activeTrip: activeTrip
        ? {
            id: activeTrip.id,
            tripType: activeTrip.tripType,
            status: activeTrip.status,
            startTime: activeTrip.startTime,
            currentStop: activeTrip.currentStop,
          }
        : null,
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        eventType: l.eventType,
        stopName: l.stopName,
        scanTime: l.scanTime,
        parentNotified: l.parentNotified,
      })),
    });
  } catch (error: any) {
    console.error("[Mobile Transport Student Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur", 500);
  }
}
