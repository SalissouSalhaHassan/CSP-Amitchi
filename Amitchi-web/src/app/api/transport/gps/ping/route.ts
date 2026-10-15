import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import {
  transportLiveTrips,
  transportGpsPings,
  transportRoutes,
  transportSubscriptions,
} from "@/infrastructure/database/schema/transport";
import { eq, and } from "drizzle-orm";
import { PushNotificationService } from "@/shared/services/push-notification.service";

export const dynamic = "force-dynamic";

// Calculate approximate distance between two coordinates in meters (Haversine Formula)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tripId,
      schoolId,
      latitude,
      longitude,
      speedKmh = 0,
      heading = 0,
      accuracy,
      currentStop,
      estimatedArrivalMinutes,
    } = body;

    if (!tripId || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "tripId, latitude et longitude sont requis." },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Update live trip record with latest GPS position
    await db
      .update(transportLiveTrips)
      .set({
        currentLat: latitude,
        currentLng: longitude,
        speedKmh,
        heading,
        lastGpsAt: now,
        status: "En cours",
        currentStop: currentStop || undefined,
        estimatedArrivalMinutes: estimatedArrivalMinutes || undefined,
      })
      .where(eq(transportLiveTrips.id, Number(tripId)));

    // 2. Insert into breadcrumb trail
    await db.insert(transportGpsPings).values({
      tripId: Number(tripId),
      schoolId: schoolId ? Number(schoolId) : undefined,
      latitude,
      longitude,
      speedKmh,
      heading,
      accuracy,
      recordedAt: now,
    });

    // 3. Geofencing check: check distance to route stops
    try {
      const trip = await db.query.transportLiveTrips.findFirst({
        where: eq(transportLiveTrips.id, Number(tripId)),
        with: { route: true },
      });

      if (trip?.route?.stops) {
        const stops = (trip.route.stops as any[]) || [];
        for (const stop of stops) {
          if (stop.lat && stop.lng) {
            const dist = getDistanceMeters(latitude, longitude, stop.lat, stop.lng);
            // If bus is within 600m of the stop (~ 2-3 minutes away), trigger approach notification
            if (dist <= 600 && !stop.approachingNotified) {
              const subs = await db.query.transportSubscriptions.findMany({
                where: and(
                  eq(transportSubscriptions.routeId, trip.routeId),
                  eq(transportSubscriptions.pickupStop, stop.stopName)
                ),
                with: { student: true },
              });

              for (const sub of subs) {
                if (sub.parentPhone) {
                  // Send WhatsApp approach alert
                  try {
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
                    await fetch(`${appUrl}/api/mobile/whatsapp`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: "bus_arrival",
                        recipientPhone: sub.parentPhone,
                        studentName: (sub.student as any)?.nomEtudiant || "l'élève",
                        busStop: stop.stopName,
                        etaMinutes: "3",
                        busNumber: trip.vehicleNumber || trip.route.vehicleNumber,
                        driverPhone: trip.route.driverPhone,
                      }),
                    }).catch(() => null);
                  } catch {}
                }
              }
            }
          }
        }
      }
    } catch (geoErr) {
      console.warn("[GPS Geofence Error]:", geoErr);
    }

    return NextResponse.json({
      success: true,
      message: "Coordonnées GPS enregistrées avec succès.",
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[GPS Ping Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'enregistrement GPS." },
      { status: 500 }
    );
  }
}
