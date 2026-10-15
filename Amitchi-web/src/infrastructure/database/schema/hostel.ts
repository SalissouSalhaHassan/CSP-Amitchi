import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schools } from "./auth";

export const hostelRooms = pgTable("hostel_rooms", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  buildingName: varchar("building_name", { length: 255 }).notNull(),
  roomType: varchar("room_type", { length: 50 }).default("Mixte"), // Garçons, Filles, Staff
  capacity: integer("capacity").default(1),
  costPerTerm: doublePrecision("cost_per_term").default(0),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("hostel_rooms_school_id_idx").on(table.schoolId),
}));

export const hostelAllocations = pgTable("hostel_allocations", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  roomId: integer("room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  joinDate: timestamp("join_date").defaultNow(),
  leaveDate: timestamp("leave_date"),
  status: varchar("status", { length: 20 }).default("Occupé"), // Occupé, Libéré
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("hostel_allocations_school_id_idx").on(table.schoolId),
  studentIdIdx: index("hostel_allocations_student_id_idx").on(table.studentId),
  roomIdIdx: index("hostel_allocations_room_id_idx").on(table.roomId),
}));

// ─── 1. Night Roll Call / Dormitory Presence ─────────────────────────────────
export const hostelNightAttendance = pgTable("hostel_night_attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  roomId: integer("room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 20 }).notNull(), // YYYY-MM-DD
  time: varchar("time", { length: 10 }), // e.g. "21:30"
  status: varchar("status", { length: 30 }).notNull().default("Présent"), // Présent, Absent non justifié, Permission / Weekend, Infirmerie
  checkedBy: varchar("checked_by", { length: 100 }).default("Surveillant Internat"),
  remarks: text("remarks"),
  parentNotified: boolean("parent_notified").default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("hostel_night_attendance_school_id_idx").on(table.schoolId),
  dateIdx: index("hostel_night_attendance_date_idx").on(table.date),
  studentIdIdx: index("hostel_night_attendance_student_id_idx").on(table.studentId),
}));

// ─── 2. Exit Passes & Weekend Permissions ─────────────────────────────────────
export const hostelExitPermissions = pgTable("hostel_exit_permissions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  roomId: integer("room_id").references(() => hostelRooms.id, { onDelete: "set null" }),
  permissionType: varchar("permission_type", { length: 50 }).notNull().default("Sortie weekend"), // Sortie weekend, Permission médicale, Visite familiale, Sortie exceptionnelle
  departureDate: varchar("departure_date", { length: 20 }).notNull(), // YYYY-MM-DD
  returnDateExpected: varchar("return_date_expected", { length: 20 }).notNull(), // YYYY-MM-DD
  actualReturnDate: varchar("actual_return_date", { length: 20 }),
  exitTime: varchar("exit_time", { length: 10 }), // e.g. "17:00"
  returnTime: varchar("return_time", { length: 10 }), // e.g. "18:30"
  guardianName: varchar("guardian_name", { length: 150 }),
  guardianPhone: varchar("guardian_phone", { length: 50 }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("En attente"), // En attente, Approuvé, Sorti, Retourné, Rejeté
  approvedBy: varchar("approved_by", { length: 100 }),
  approvalRemarks: text("approval_remarks"),
  parentNotified: boolean("parent_notified").default(false),
  parentNotifiedAt: timestamp("parent_notified_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("hostel_exit_permissions_school_id_idx").on(table.schoolId),
  studentIdIdx: index("hostel_exit_permissions_student_id_idx").on(table.studentId),
  statusIdx: index("hostel_exit_permissions_status_idx").on(table.status),
}));

// ─── 3. Dormitory Visitors Register ───────────────────────────────────────────
export const hostelVisitorsLog = pgTable("hostel_visitors_log", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  visitorName: varchar("visitor_name", { length: 150 }).notNull(),
  relation: varchar("relation", { length: 50 }).notNull().default("Parent"), // Père, Mère, Frère, Sœur, Tuteur, Autre
  visitorPhone: varchar("visitor_phone", { length: 50 }),
  cnic: varchar("cnic", { length: 50 }), // Carte d'identité
  visitDate: varchar("visit_date", { length: 20 }).notNull(), // YYYY-MM-DD
  entryTime: varchar("entry_time", { length: 10 }).notNull(), // e.g. "15:00"
  exitTime: varchar("exit_time", { length: 10 }), // e.g. "17:30"
  purpose: text("purpose").default("Visite familiale"),
  remarks: text("remarks"),
  recordedBy: varchar("recorded_by", { length: 100 }).default("Gardien internat"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("hostel_visitors_log_school_id_idx").on(table.schoolId),
  studentIdIdx: index("hostel_visitors_log_student_id_idx").on(table.studentId),
  dateIdx: index("hostel_visitors_log_date_idx").on(table.visitDate),
}));

// ─── Relations ────────────────────────────────────────────────────────────────
export const hostelRoomsRelations = relations(hostelRooms, ({ many }) => ({
  allocations: many(hostelAllocations),
  nightAttendances: many(hostelNightAttendance),
}));

export const hostelAllocationsRelations = relations(hostelAllocations, ({ one }) => ({
  student: one(students, {
    fields: [hostelAllocations.studentId],
    references: [students.id],
  }),
  room: one(hostelRooms, {
    fields: [hostelAllocations.roomId],
    references: [hostelRooms.id],
  }),
}));

export const hostelNightAttendanceRelations = relations(hostelNightAttendance, ({ one }) => ({
  student: one(students, {
    fields: [hostelNightAttendance.studentId],
    references: [students.id],
  }),
  room: one(hostelRooms, {
    fields: [hostelNightAttendance.roomId],
    references: [hostelRooms.id],
  }),
}));

export const hostelExitPermissionsRelations = relations(hostelExitPermissions, ({ one }) => ({
  student: one(students, {
    fields: [hostelExitPermissions.studentId],
    references: [students.id],
  }),
  room: one(hostelRooms, {
    fields: [hostelExitPermissions.roomId],
    references: [hostelRooms.id],
  }),
}));

export const hostelVisitorsLogRelations = relations(hostelVisitorsLog, ({ one }) => ({
  student: one(students, {
    fields: [hostelVisitorsLog.studentId],
    references: [students.id],
  }),
}));
