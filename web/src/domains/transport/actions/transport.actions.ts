"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  transportRoutes,
  transportSubscriptions,
  transportLiveTrips,
  transportBoardingLogs,
} from "@/infrastructure/database/schema/transport";
import { students } from "@/infrastructure/database/schema/students";
import { and, eq, ilike, or, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── 1. Dashboard KPI Stats ──────────────────────────────────────────────────

export async function getTransportDashboardStats() {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const todayStr = new Date().toISOString().slice(0, 10);

    const [routesCount, subsCount, tripsTodayCount, boardingsTodayCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(transportRoutes)
        .where(schoolId ? eq(transportRoutes.schoolId, schoolId) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(transportSubscriptions)
        .where(
          and(
            schoolId ? eq(transportSubscriptions.schoolId, schoolId) : undefined,
            eq(transportSubscriptions.status, "Actif")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(transportLiveTrips)
        .where(
          and(
            schoolId ? eq(transportLiveTrips.schoolId, schoolId) : undefined,
            eq(transportLiveTrips.tripDate, todayStr)
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(transportBoardingLogs)
        .where(
          and(
            schoolId ? eq(transportBoardingLogs.schoolId, schoolId) : undefined,
            sql`date(scan_time) = CURRENT_DATE`
          )
        ),
    ]);

    return {
      totalRoutes: Number(routesCount[0]?.count || 0),
      activeSubscriptions: Number(subsCount[0]?.count || 0),
      tripsToday: Number(tripsTodayCount[0]?.count || 0),
      boardingsToday: Number(boardingsTodayCount[0]?.count || 0),
    };
  });
}

// ─── 2. Routes & Stops Management ────────────────────────────────────────────

export async function getTransportRoutes() {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const routes = await readDb.query.transportRoutes.findMany({
      where: eq(transportRoutes.schoolId, schoolId),
      with: {
        subscriptions: {
          where: eq(transportSubscriptions.status, "Actif"),
        },
      },
      orderBy: [desc(transportRoutes.createdAt)],
    });

    const enriched = routes.map((r) => ({
      ...r,
      subscribersCount: r.subscriptions?.length || 0,
    }));

    return { data: enriched };
  });
}

export async function saveTransportRoute(
  data: {
    id?: number;
    routeName: string;
    vehicleNumber: string;
    driverName: string;
    driverPhone?: string | null;
    capacity?: number;
    monthlyFee?: number;
    stops?: any[];
    status?: string;
    notes?: string;
  },
  id?: number
) {
  return protectedDbAction("Transport", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    const targetId = id || data.id;

    const payload = {
      schoolId,
      routeName: data.routeName,
      vehicleNumber: data.vehicleNumber,
      driverName: data.driverName,
      driverPhone: data.driverPhone || null,
      capacity: Number(data.capacity || 30),
      monthlyFee: Number(data.monthlyFee || 15000),
      stops: data.stops || [],
      status: data.status || "Actif",
      notes: data.notes || null,
    };

    if (targetId) {
      await db
        .update(transportRoutes)
        .set(payload)
        .where(and(eq(transportRoutes.id, targetId), eq(transportRoutes.schoolId, schoolId)));
    } else {
      await db.insert(transportRoutes).values(payload);
    }

    revalidatePath("/dashboard/transport");
    return { success: true, message: "Ligne de transport enregistrée avec succès." };
  });
}

export async function deleteTransportRoute(id: number) {
  return protectedDbAction("Transport", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Accès refusé." };

    await db
      .delete(transportRoutes)
      .where(and(eq(transportRoutes.id, id), eq(transportRoutes.schoolId, schoolId)));

    revalidatePath("/dashboard/transport");
    return { success: true, message: "Ligne de transport supprimée." };
  });
}

// ─── 3. Subscriptions & Digital Boarding Passes ─────────────────────────────

export async function getTransportSubscriptions(params?: { routeId?: number; query?: string }) {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const conditions = [eq(transportSubscriptions.schoolId, schoolId)];
    if (params?.routeId) {
      conditions.push(eq(transportSubscriptions.routeId, params.routeId));
    }

    const subs = await readDb.query.transportSubscriptions.findMany({
      where: and(...conditions),
      with: {
        student: true,
        route: true,
      },
      orderBy: [desc(transportSubscriptions.createdAt)],
    });

    let filtered = subs;
    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      filtered = subs.filter(
        (s) =>
          s.student?.nomEtudiant?.toLowerCase().includes(q) ||
          s.student?.numAdmission?.toLowerCase().includes(q) ||
          s.pickupStop?.toLowerCase().includes(q) ||
          s.route?.routeName?.toLowerCase().includes(q)
      );
    }

    return { data: filtered };
  });
}

export async function addSubscription(data: {
  studentId: number;
  routeId: number;
  pickupPoint?: string;
  pickupStop?: string;
  dropoffStop?: string;
  tripType?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  startDate?: Date;
}) {
  return protectedDbAction("Transport", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    const [student, route] = await Promise.all([
      db.query.students.findFirst({
        where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)),
      }),
      db.query.transportRoutes.findFirst({
        where: and(eq(transportRoutes.id, data.routeId), eq(transportRoutes.schoolId, schoolId)),
      }),
    ]);

    if (!student || !route) return { error: "Élève ou Ligne de transport introuvable." };

    const parentPhone = data.parentPhone || (student as any)?.mobile || (student as any)?.phoneFixe || null;
    const parentWhatsapp = data.parentWhatsapp || (student as any)?.whatsapp || parentPhone;

    await db.insert(transportSubscriptions).values({
      schoolId,
      studentId: data.studentId,
      routeId: data.routeId,
      pickupPoint: data.pickupPoint || data.pickupStop || "Arrêt principal",
      pickupStop: data.pickupStop || data.pickupPoint || "Arrêt principal",
      dropoffStop: data.dropoffStop || "École",
      tripType: data.tripType || "Aller-Retour",
      parentPhone,
      parentWhatsapp,
      startDate: data.startDate || new Date(),
      status: "Actif",
    });

    // Optionally update student's frais_transport
    if (route.monthlyFee && route.monthlyFee > 0) {
      await db
        .update(students)
        .set({ fraisTransport: route.monthlyFee })
        .where(eq(students.id, data.studentId));
    }

    revalidatePath("/dashboard/transport");
    return { success: true, message: "Élève inscrit au circuit de transport avec succès." };
  });
}

export async function removeSubscription(id: number) {
  return protectedDbAction("Transport", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    await db
      .delete(transportSubscriptions)
      .where(
        and(eq(transportSubscriptions.id, id), eq(transportSubscriptions.schoolId, schoolId))
      );

    revalidatePath("/dashboard/transport");
    return { success: true, message: "Abonnement transport retiré." };
  });
}

// ─── 4. Live Trips & Circuit Execution ───────────────────────────────────────

export async function getLiveTripsAction(date?: string) {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const targetDate = date || new Date().toISOString().slice(0, 10);

    const trips = await readDb.query.transportLiveTrips.findMany({
      where: and(
        eq(transportLiveTrips.schoolId, schoolId),
        eq(transportLiveTrips.tripDate, targetDate)
      ),
      with: {
        route: true,
        boardingLogs: {
          with: { student: true },
        },
      },
      orderBy: [desc(transportLiveTrips.createdAt)],
    });

    return { data: trips };
  });
}

export async function startLiveTripAction(data: {
  routeId: number;
  tripType: string; // 'Circuit Matin', 'Circuit Soir', 'Sortie Spéciale'
  driverName?: string;
  vehicleNumber?: string;
}) {
  return protectedDbAction("Transport", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const route = await db.query.transportRoutes.findFirst({
      where: and(eq(transportRoutes.id, data.routeId), eq(transportRoutes.schoolId, schoolId)),
    });

    if (!route) return { error: "Ligne de transport introuvable." };

    const stops = (route.stops as any[]) || [];
    const initialStop = stops.length > 0 ? stops[0].stopName : "Point de départ";

    const [trip] = await db
      .insert(transportLiveTrips)
      .values({
        schoolId,
        routeId: data.routeId,
        tripDate: todayStr,
        tripType: data.tripType || "Circuit Matin",
        driverName: data.driverName || route.driverName,
        vehicleNumber: data.vehicleNumber || route.vehicleNumber,
        status: "En cours",
        startTime: nowTime,
        currentStop: initialStop,
      })
      .returning();

    revalidatePath("/dashboard/transport");
    return { success: true, trip, message: `Trajet ${data.tripType} démarré avec succès.` };
  });
}

export async function updateLiveTripStatusAction(data: {
  tripId: number;
  status: "En cours" | "Terminé" | "Annulé";
  currentStop?: string;
}) {
  return protectedDbAction("Transport", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const updatePayload: any = {
      status: data.status,
    };

    if (data.currentStop) {
      updatePayload.currentStop = data.currentStop;
    }

    if (data.status === "Terminé") {
      updatePayload.endTime = nowTime;
    }

    await db
      .update(transportLiveTrips)
      .set(updatePayload)
      .where(
        and(eq(transportLiveTrips.id, data.tripId), eq(transportLiveTrips.schoolId, schoolId))
      );

    revalidatePath("/dashboard/transport");
    return { success: true, message: `Statut du trajet mis à jour (${data.status}).` };
  });
}

// ─── 5. Student Boarding Check-In & Parent Alerts ───────────────────────────

export async function recordStudentBoardingAction(data: {
  tripId?: number;
  studentId: number;
  subscriptionId?: number;
  eventType: "Montée Matin" | "Descente Matin (École)" | "Montée Soir (École)" | "Descente Soir (Maison)";
  stopName: string;
  scannedBy?: string;
  notifyParent?: boolean;
}) {
  return protectedDbAction("Transport", "canEdit", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user.schoolId || 1;
    const nowTime = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const [student, subscription] = await Promise.all([
      db.query.students.findFirst({
        where: eq(students.id, data.studentId),
      }),
      data.subscriptionId
        ? db.query.transportSubscriptions.findFirst({
            where: eq(transportSubscriptions.id, data.subscriptionId),
            with: { route: true },
          })
        : db.query.transportSubscriptions.findFirst({
            where: and(
              eq(transportSubscriptions.studentId, data.studentId),
              eq(transportSubscriptions.status, "Actif")
            ),
            with: { route: true },
          }),
    ]);

    if (!student) return { error: "Élève introuvable." };

    let parentNotified = false;
    const parentPhone =
      subscription?.parentPhone ||
      (student as any)?.mobile ||
      (student as any)?.whatsapp ||
      (student as any)?.telephoneParent;

    const routeName = subscription?.route?.routeName || "Ligne Scolaire";
    const vehicleNumber = subscription?.route?.vehicleNumber || "Bus";

    // 1. Insert boarding log
    const [inserted] = await db
      .insert(transportBoardingLogs)
      .values({
        schoolId,
        tripId: data.tripId || null,
        subscriptionId: subscription?.id || null,
        studentId: data.studentId,
        scanTime: new Date(),
        eventType: data.eventType,
        stopName: data.stopName,
        scannedBy: data.scannedBy || user.nomPrenom || user.utilisateur || "Surveillant de bus",
        parentNotified: false,
      })
      .returning();

    // 2. Dispatch Parent WhatsApp & SMS Alert
    if ((data.notifyParent ?? true) && parentPhone) {
      try {
        await MessagingService.sendTransportBoardingAlert({
          to: parentPhone,
          whatsapp: subscription?.parentWhatsapp || (student as any)?.whatsapp || parentPhone,
          parentName: (student as any)?.nomPere || (student as any)?.nomParent || "Parent d'élève",
          studentName: student.nomEtudiant,
          eventType: data.eventType,
          routeName,
          vehicleNumber,
          time: nowTime,
          stopName: data.stopName,
          schoolName: "Edut Pro",
          sendSMS: true,
          sendWhatsApp: true,
        });

        parentNotified = true;
        await db
          .update(transportBoardingLogs)
          .set({ parentNotified: true, parentNotificationSentAt: new Date() })
          .where(eq(transportBoardingLogs.id, inserted.id));
      } catch (err) {
        console.error("⚠️ Failed to dispatch boarding parent alert:", err);
      }
    }

    revalidatePath("/dashboard/transport");
    return {
      success: true,
      logId: inserted.id,
      parentNotified,
      message: `Pointage enregistré : ${data.eventType} pour ${student.nomEtudiant}.`,
    };
  });
}

export async function getTransportBoardingLogs(params?: {
  tripId?: number;
  studentId?: number;
  date?: string;
  limit?: number;
}) {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const conditions = [eq(transportBoardingLogs.schoolId, schoolId)];
    if (params?.tripId) {
      conditions.push(eq(transportBoardingLogs.tripId, params.tripId));
    }
    if (params?.studentId) {
      conditions.push(eq(transportBoardingLogs.studentId, params.studentId));
    }

    const logs = await readDb.query.transportBoardingLogs.findMany({
      where: and(...conditions),
      with: {
        student: true,
        trip: {
          with: { route: true },
        },
      },
      orderBy: [desc(transportBoardingLogs.scanTime)],
      limit: params?.limit || 50,
    });

    return { data: logs };
  });
}

// ─── 6. Student Autocomplete Helper ──────────────────────────────────────────

export async function searchStudentsAction(query: string) {
  return protectedDbAction("Transport", "canView", async () => {
    if (!query || query.trim() === "") return { data: [] };
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const data = await readDb.query.students.findMany({
      where: and(
        schoolId ? eq(students.schoolId, schoolId) : undefined,
        eq(students.statut, "Actif"),
        or(
          ilike(students.nomEtudiant, `%${query.trim()}%`),
          ilike(students.numAdmission, `%${query.trim()}%`),
          ilike(students.classe, `%${query.trim()}%`)
        )
      ),
      limit: 10,
    });

    return { data };
  });
}
