import { redirect } from "next/navigation";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId, getActiveBranchData, getCurrentSchool } from "@/domains/auth/services/school";
import { db } from "@/infrastructure/database";
import { transportRoutes, transportLiveTrips } from "@/infrastructure/database/schema/transport";
import { eq, desc, or, isNull } from "drizzle-orm";
import { resolveSchoolCoordinates } from "@/domains/transport/data/localities";
import LiveMapClient from "./live-map-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Radar GPS Transport Scolaire en Direct — Edut Pro",
  description: "Suivi en temps réel des bus scolaires, itinéraires, vitesses et arrêts",
};

export default async function TransportLiveMapPage() {
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;
  const currentSchool = await getCurrentSchool();
  const { branchData } = await getActiveBranchData(user);

  let formattedRoutes: any[] = [];
  let formattedTrips: any[] = [];

  try {
    const routes = await db.query.transportRoutes.findMany({
      where: or(
        eq(transportRoutes.schoolId, schoolId),
        isNull(transportRoutes.schoolId)
      ),
      with: {
        liveTrips: {
          orderBy: (t, { desc }) => [desc(t.createdAt)],
          limit: 1,
        },
      },
    });

    formattedRoutes = (routes || []).map((r: any) => ({
      id: r.id,
      routeName: r.routeName || "Itinéraire",
      vehicleNumber: r.vehicleNumber || "",
      driverName: r.driverName || "",
      driverPhone: r.driverPhone || undefined,
      capacity: r.capacity || undefined,
      status: r.status || "Actif",
      stops: r.stops || [],
    }));
  } catch (err) {
    console.error("[Transport Live Map] Error fetching routes:", err);
  }

  try {
    const activeTrips = await db.query.transportLiveTrips.findMany({
      where: or(
        eq(transportLiveTrips.schoolId, schoolId),
        isNull(transportLiveTrips.schoolId)
      ),
      with: {
        route: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    formattedTrips = (activeTrips || []).map((t: any) => ({
      id: t.id,
      routeId: t.routeId,
      tripDate: t.tripDate ? String(t.tripDate) : new Date().toISOString(),
      tripType: t.tripType || "MORNING",
      driverName: t.driverName || undefined,
      vehicleNumber: t.vehicleNumber || undefined,
      status: t.status || "EN_ROUTE",
      currentStop: t.currentStop || undefined,
      currentLat: t.currentLat ? Number(t.currentLat) : undefined,
      currentLng: t.currentLng ? Number(t.currentLng) : undefined,
      speedKmh: t.speedKmh ? Number(t.speedKmh) : undefined,
      heading: t.heading ? Number(t.heading) : undefined,
      lastGpsAt: t.lastGpsAt ? String(t.lastGpsAt) : undefined,
      estimatedArrivalMinutes: t.estimatedArrivalMinutes ? Number(t.estimatedArrivalMinutes) : undefined,
      route: t.route ? {
        id: t.route.id,
        routeName: t.route.routeName || "Itinéraire",
        vehicleNumber: t.route.vehicleNumber || "",
        driverName: t.route.driverName || "",
        stops: t.route.stops || [],
      } : undefined,
    }));
  } catch (err) {
    console.error("[Transport Live Map] Error fetching trips:", err);
  }

  const firstRouteName = formattedRoutes[0]?.routeName || formattedTrips[0]?.route?.routeName || "";
  const schoolLocation = resolveSchoolCoordinates(currentSchool, branchData, firstRouteName);

  // If a trip has no live GPS fix, smart-initialize coordinates based on route name / school
  formattedTrips = formattedTrips.map((t) => {
    let lat = t.currentLat;
    let lng = t.currentLng;
    if (lat == null || lng == null || (lat === 0 && lng === 0)) {
      const combinedText = `${t.route?.routeName || ""} ${t.vehicleNumber || ""}`.toLowerCase();
      if (combinedText.includes("bagalam") || combinedText.includes("maradi")) {
        lat = 13.4862;
        lng = 7.1085;
      } else {
        lat = schoolLocation.lat;
        lng = schoolLocation.lng;
      }
    }
    return { ...t, currentLat: lat, currentLng: lng };
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <LiveMapClient
        schoolId={schoolId}
        initialRoutes={formattedRoutes}
        initialTrips={formattedTrips}
        schoolLocation={schoolLocation}
      />
    </div>
  );
}
