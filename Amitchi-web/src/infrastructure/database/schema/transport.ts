import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schools } from "./auth";

export const transportRoutes = pgTable("transport_routes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  routeName: varchar("route_name", { length: 255 }).notNull(), // e.g. "Ligne 1 - Plateau / Yantala"
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(), // e.g. "RN-4829-A"
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  driverPhone: varchar("driver_phone", { length: 50 }),
  capacity: integer("capacity").default(30), // Bus passenger capacity
  monthlyFee: doublePrecision("monthly_fee").notNull().default(15000), // CFA
  stops: jsonb("stops"), // Array of { id: string, stopName: string, timeMorning: string, timeEvening: string, order: number }
  status: varchar("status", { length: 20 }).default("Actif"), // 'Actif', 'Inactif', 'Maintenance'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("transport_routes_school_id_idx").on(table.schoolId),
}));

export const transportSubscriptions = pgTable("transport_subscriptions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  routeId: integer("route_id").references(() => transportRoutes.id, { onDelete: "cascade" }).notNull(),
  pickupPoint: varchar("pickup_point", { length: 255 }), // Preferred stop
  pickupStop: varchar("pickup_stop", { length: 255 }), // Exact stop name
  dropoffStop: varchar("dropoff_stop", { length: 255 }),
  tripType: varchar("trip_type", { length: 50 }).default("Aller-Retour"), // 'Aller-Retour', 'Aller simple matin', 'Retour simple soir'
  parentPhone: varchar("parent_phone", { length: 50 }),
  parentWhatsapp: varchar("parent_whatsapp", { length: 50 }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("Actif"), // 'Actif', 'Suspendu', 'Annulé'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("transport_subscriptions_school_id_idx").on(table.schoolId),
  studentIdIdx: index("transport_subscriptions_student_id_idx").on(table.studentId),
  routeIdIdx: index("transport_subscriptions_route_id_idx").on(table.routeId),
}));

export const transportLiveTrips = pgTable("transport_live_trips", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  routeId: integer("route_id").references(() => transportRoutes.id, { onDelete: "cascade" }).notNull(),
  tripDate: varchar("trip_date", { length: 20 }).notNull(), // 'YYYY-MM-DD'
  tripType: varchar("trip_type", { length: 50 }).default("Circuit Matin"), // 'Circuit Matin', 'Circuit Soir', 'Sortie Pédagogique'
  driverName: varchar("driver_name", { length: 150 }),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  status: varchar("status", { length: 30 }).default("Programmé"), // 'Programmé', 'En cours', 'Terminé', 'Annulé'
  startTime: varchar("start_time", { length: 20 }), // e.g. "06:45"
  endTime: varchar("end_time", { length: 20 }), // e.g. "07:35"
  currentStop: varchar("current_stop", { length: 150 }),
  currentLat: doublePrecision("current_lat"),
  currentLng: doublePrecision("current_lng"),
  speedKmh: doublePrecision("speed_kmh").default(0),
  heading: doublePrecision("heading").default(0),
  lastGpsAt: timestamp("last_gps_at"),
  estimatedArrivalMinutes: integer("estimated_arrival_minutes"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("transport_live_trips_school_id_idx").on(table.schoolId),
  routeIdIdx: index("transport_live_trips_route_id_idx").on(table.routeId),
  tripDateIdx: index("transport_live_trips_date_idx").on(table.tripDate),
}));


export const transportBoardingLogs = pgTable("transport_boarding_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  tripId: integer("trip_id").references(() => transportLiveTrips.id, { onDelete: "cascade" }),
  subscriptionId: integer("subscriptionId").references(() => transportSubscriptions.id, { onDelete: "set null" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  scanTime: timestamp("scan_time").defaultNow().notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'Montée Matin', 'Descente Matin (École)', 'Montée Soir (École)', 'Descente Soir (Maison)'
  stopName: varchar("stop_name", { length: 150 }),
  scannedBy: varchar("scanned_by", { length: 150 }).default("Surveillant de bus"),
  parentNotified: boolean("parent_notified").default(false),
  parentNotificationSentAt: timestamp("parent_notification_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("transport_boarding_logs_school_id_idx").on(table.schoolId),
  tripIdIdx: index("transport_boarding_logs_trip_id_idx").on(table.tripId),
  studentIdIdx: index("transport_boarding_logs_student_id_idx").on(table.studentId),
  scanTimeIdx: index("transport_boarding_logs_scan_time_idx").on(table.scanTime),
}));

export const transportRoutesRelations = relations(transportRoutes, ({ many }) => ({
  subscriptions: many(transportSubscriptions),
  liveTrips: many(transportLiveTrips),
}));

export const transportSubscriptionsRelations = relations(transportSubscriptions, ({ one, many }) => ({
  student: one(students, {
    fields: [transportSubscriptions.studentId],
    references: [students.id],
  }),
  route: one(transportRoutes, {
    fields: [transportSubscriptions.routeId],
    references: [transportRoutes.id],
  }),
  boardingLogs: many(transportBoardingLogs),
}));

export const transportLiveTripsRelations = relations(transportLiveTrips, ({ one, many }) => ({
  route: one(transportRoutes, {
    fields: [transportLiveTrips.routeId],
    references: [transportRoutes.id],
  }),
  boardingLogs: many(transportBoardingLogs),
}));

export const transportBoardingLogsRelations = relations(transportBoardingLogs, ({ one }) => ({
  trip: one(transportLiveTrips, {
    fields: [transportBoardingLogs.tripId],
    references: [transportLiveTrips.id],
  }),
  student: one(students, {
    fields: [transportBoardingLogs.studentId],
    references: [students.id],
  }),
  subscription: one(transportSubscriptions, {
    fields: [transportBoardingLogs.subscriptionId],
    references: [transportSubscriptions.id],
  }),
}));

export const transportGpsPings = pgTable("transport_gps_pings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => transportLiveTrips.id, { onDelete: "cascade" }).notNull(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  speedKmh: doublePrecision("speed_kmh").default(0),
  heading: doublePrecision("heading").default(0),
  accuracy: doublePrecision("accuracy"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => ({
  tripIdIdx: index("transport_gps_pings_trip_id_idx").on(table.tripId),
  recordedAtIdx: index("transport_gps_pings_recorded_at_idx").on(table.recordedAt),
}));

export const transportGpsPingsRelations = relations(transportGpsPings, ({ one }) => ({
  trip: one(transportLiveTrips, {
    fields: [transportGpsPings.tripId],
    references: [transportLiveTrips.id],
  }),
}));

