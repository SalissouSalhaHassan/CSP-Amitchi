import { pgTable, serial, integer, varchar, text, timestamp, doublePrecision, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";
import { students } from "./students";
import { employees } from "./hr";

export const studentMedicalRecords = pgTable("student_medical_records", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  bloodGroup: varchar("blood_group", { length: 10 }), // A+, A-, B+, B-, AB+, AB-, O+, O-
  allergies: text("allergies"), // e.g. "Arachides, Pénicilline, Poussière"
  chronicConditions: text("chronic_conditions"), // e.g. "Asthme, Drépanocytose SS, Diabète"
  regularMedications: text("regular_medications"),
  vaccinations: jsonb("vaccinations"), // Array of { name: string, date: string, isDone: boolean }
  emergencyContactName: varchar("emergency_contact_name", { length: 150 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  emergencyContactRelation: varchar("emergency_contact_relation", { length: 50 }), // Père, Mère, Tuteur
  doctorName: varchar("doctor_name", { length: 150 }),
  doctorPhone: varchar("doctor_phone", { length: 50 }),
  heightCm: doublePrecision("height_cm"),
  weightKg: doublePrecision("weight_kg"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("student_medical_records_school_id_idx").on(table.schoolId),
  studentIdIdx: index("student_medical_records_student_id_idx").on(table.studentId),
}));

export const infirmaryVisits = pgTable("infirmary_visits", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  nurseId: integer("nurse_id").references(() => employees.id, { onDelete: "set null" }),
  nurseName: varchar("nurse_name", { length: 150 }),
  visitDate: timestamp("visit_date").defaultNow().notNull(),
  symptoms: text("symptoms").notNull(), // Fièvre, Maux de tête, Céphalées, Traumatisme, etc.
  temperature: doublePrecision("temperature"), // e.g. 38.5 (°C)
  bloodPressure: varchar("blood_pressure", { length: 20 }), // e.g. "12/8"
  heartRate: integer("heart_rate"), // bpm
  diagnosis: text("diagnosis"),
  careProvided: text("care_provided"), // Soins administrés, repos au lit, etc.
  prescriptions: text("prescriptions"), // Médicaments prescrits / fournis (Paracétamol, Artéméther, etc.)
  severity: varchar("severity", { length: 30 }).default("Bénin"), // 'Bénin', 'Modéré', 'Urgent'
  outcome: varchar("outcome", { length: 50 }).default("Retour en classe"), // 'Retour en classe', 'Retour à domicile', 'Évacuation hôpital'
  parentNotified: boolean("parent_notified").default(false),
  parentNotificationSentAt: timestamp("parent_notification_sent_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("infirmary_visits_school_id_idx").on(table.schoolId),
  studentIdIdx: index("infirmary_visits_student_id_idx").on(table.studentId),
  visitDateIdx: index("infirmary_visits_visit_date_idx").on(table.visitDate),
}));

export const studentMedicalRecordsRelations = relations(studentMedicalRecords, ({ one }) => ({
  student: one(students, {
    fields: [studentMedicalRecords.studentId],
    references: [students.id],
  }),
}));

export const infirmaryVisitsRelations = relations(infirmaryVisits, ({ one }) => ({
  student: one(students, {
    fields: [infirmaryVisits.studentId],
    references: [students.id],
  }),
  nurse: one(employees, {
    fields: [infirmaryVisits.nurseId],
    references: [employees.id],
  }),
}));
