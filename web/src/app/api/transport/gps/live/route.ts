import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { transportLiveTrips, transportRoutes, transportGpsPings } from "@/infrastructure/database/schema/transport";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");
    const routeId = searchParams.get("routeId");

    if (tripId) {
      // Fetch specific trip with recent GPS history
      const trip = await db.query.transportLiveTrips.findFirst({
        where: eq(transportLiveTrips.id, Number(tripId)),
        with: {
          route: true,
        },
      });

      if (!trip) {
        return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
      }

      // Recent 50 GPS points for the route trail
      const pings = await db.query.transportGpsPings.findMany({
        where: eq(transportGpsPings.tripId, Number(tripId)),
        orderBy: (t, { desc }) => [desc(t.recordedAt)],
        limit: 50,
      });

      return NextResponse.json({
        success: true,
        trip: {
          ...trip,
          recentPings: pings.reverse(),
        },
      });
    }

    // Fetch all active trips (today or in progress)
    const activeTrips = await db.query.transportLiveTrips.findMany({
      with: {
        route: true,
      },
      orderBy: (t, { desc }) => [desc(t.lastGpsAt)],
      limit: 20,
    });

    const sanitizedTrips = activeTrips.map((t: any) => {
      let lat = t.currentLat;
      let lng = t.currentLng;
      if (lat == null || lng == null || (lat === 0 && lng === 0)) {
        const routeText = `${t.route?.routeName || ""} ${t.vehicleNumber || ""}`.toLowerCase();
        if (routeText.includes("maradi") || routeText.includes("bagalam")) {
          lat = 13.4862;
          lng = 7.1085;
        } else if (routeText.includes("zinder")) {
          lat = 13.8072;
          lng = 8.9883;
        } else {
          lat = 13.5126;
          lng = 2.1126;
        }
      }
      return { ...t, currentLat: lat, currentLng: lng };
    });

    return NextResponse.json({
      success: true,
      data: sanitizedTrips,
    });
  } catch (error: any) {
    console.error("[GPS Live Query Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la récupération des positions GPS." },
      { status: 500 }
    );
  }
}
