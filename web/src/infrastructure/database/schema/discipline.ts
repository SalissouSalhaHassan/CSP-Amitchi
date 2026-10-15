import { pgTable, serial, varchar, integer, timestamp, text, doublePrecision, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schools } from "./auth";

export const disciplineIncidents = pgTable("discipline_incidents", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").defaultNow(),
  incidentType: varchar("incident_type", { length: 255 }).notNull(), // Indiscipline, Retard répété, Bagarre, Absence non justifiée, etc.
  severity: varchar("severity", { length: 50 }).notNull().default("Mineur"), // Mineur, Majeur, Critique
  description: text("description"),
  proposedAction: varchar("proposed_action", { length: 255 }),
  sanctionType: varchar("sanction_type", { length: 100 }).default("Rappel à l'ordre"), // 'Rappel à l'ordre', 'Avertissement écrit', 'Blâme officiel', 'Retenue', 'Exclusion temporaire', 'Renvoi Conseil Discipline'
  sanctionDurationDays: integer("sanction_duration_days").default(0),
  status: varchar("status", { length: 50 }).notNull().default("En attente"), // En attente, Résolu, Conseil de Discipline
  parentNotified: boolean("parent_notified").default(false),
  parentNotificationSentAt: timestamp("parent_notification_sent_at"),
  createdBy: varchar("created_by", { length: 255 }).default("Admin"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("discipline_incidents_school_id_idx").on(table.schoolId),
  studentIdIdx: index("discipline_incidents_student_id_idx").on(table.studentId),
}));

export const disciplinaryCouncils = pgTable("disciplinary_councils", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  incidentId: integer("incident_id").references(() => disciplineIncidents.id, { onDelete: "set null" }),
  sessionDate: timestamp("session_date").defaultNow().notNull(),
  location: varchar("location", { length: 150 }).default("Salle de délibération"),
  presidentName: varchar("president_name", { length: 150 }),
  membersPresent: text("members_present"), // Comma separated or JSON string
  parentConvocationStatus: varchar("parent_convocation_status", { length: 50 }).default("Convoqué"), // 'Convoqué', 'Présent', 'Excusé', 'Absent'
  reproachedFacts: text("reproached_facts").notNull(),
  studentDefense: text("student_defense"),
  decisionType: varchar("decision_type", { length: 150 }).notNull(), // 'Avertissement solennel', 'Blâme avec inscription dossier', 'Exclusion temporaire (1 à 8 jours)', 'Exclusion définitive', 'Non-lieu'
  exclusionDays: integer("exclusion_days").default(0),
  exclusionStartDate: varchar("exclusion_start_date", { length: 30 }),
  exclusionEndDate: varchar("exclusion_end_date", { length: 30 }),
  reportSummary: text("report_summary"),
  status: varchar("status", { length: 50 }).default("Programmé"), // 'Programmé', 'Clôturé / Sanctionné', 'Annulé'
  parentNotified: boolean("parent_notified").default(false),
  parentNotificationSentAt: timestamp("parent_notification_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("disciplinary_councils_school_id_idx").on(table.schoolId),
  studentIdIdx: index("disciplinary_councils_student_id_idx").on(table.studentId),
}));

export const parentConvocations = pgTable("parent_convocations", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  incidentId: integer("incident_id").references(() => disciplineIncidents.id, { onDelete: "set null" }),
  reason: text("reason").notNull(), // Motif de la convocation
  convocationDate: timestamp("convocation_date").notNull(),
  location: varchar("location", { length: 150 }).default("Bureau du Censeur / Surveillant Général"),
  status: varchar("status", { length: 50 }).default("Envoyé"), // 'Envoyé', 'Confirmé', 'Honoré', 'Non honoré'
  channel: varchar("channel", { length: 50 }).default("WhatsApp"),
  parentNotified: boolean("parent_notified").default(false),
  parentNotificationSentAt: timestamp("parent_notification_sent_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("parent_convocations_school_id_idx").on(table.schoolId),
  studentIdIdx: index("parent_convocations_student_id_idx").on(table.studentId),
}));

export const behaviorRewards = pgTable("behavior_rewards", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  rewardType: varchar("reward_type", { length: 100 }).notNull(), // Encouragement, Tableau d'Honneur, Félicitations, Avertissement, Blâme
  pointsEffect: doublePrecision("points_effect").default(0.0).notNull(), // e.g. +10, -5
  reason: text("reason").notNull(),
  grantedBy: varchar("granted_by", { length: 255 }), // Name of teacher/admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const counselorNotes = pgTable("counselor_notes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  noteType: varchar("note_type", { length: 100 }).notNull(), // Psychologique, Social, Comportemental, Académique
  confidentialContent: text("confidential_content").notNull(),
  recommendations: text("recommendations"),
  isSecret: boolean("is_secret").default(true).notNull(),
  counselorId: integer("counselor_id"), // references users.id/employees.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const disciplineIncidentsRelations = relations(disciplineIncidents, ({ one, many }) => ({
  student: one(students, {
    fields: [disciplineIncidents.studentId],
    references: [students.id],
  }),
  councils: many(disciplinaryCouncils),
}));

export const disciplinaryCouncilsRelations = relations(disciplinaryCouncils, ({ one }) => ({
  student: one(students, {
    fields: [disciplinaryCouncils.studentId],
    references: [students.id],
  }),
  incident: one(disciplineIncidents, {
    fields: [disciplinaryCouncils.incidentId],
    references: [disciplineIncidents.id],
  }),
}));

export const parentConvocationsRelations = relations(parentConvocations, ({ one }) => ({
  student: one(students, {
    fields: [parentConvocations.studentId],
    references: [students.id],
  }),
}));

export const behaviorRewardsRelations = relations(behaviorRewards, ({ one }) => ({
  student: one(students, {
    fields: [behaviorRewards.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [behaviorRewards.schoolId],
    references: [schools.id],
  }),
}));

export const counselorNotesRelations = relations(counselorNotes, ({ one }) => ({
  student: one(students, {
    fields: [counselorNotes.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [counselorNotes.schoolId],
    references: [schools.id],
  }),
}));
