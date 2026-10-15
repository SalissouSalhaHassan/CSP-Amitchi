import { pgTable, serial, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schoolClasses, schoolSubjects } from "./academics";
import { employees } from "./hr";

export const timetableEntries = pgTable("timetable_entries", {
  id: serial("id").primaryKey(),
  dayName: varchar("day_name", { length: 20 }).notNull(), // Lundi, Mardi, etc.
  periodNumber: integer("period_number").notNull(),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timetableSettings = pgTable("timetable_settings", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }).unique(), // null for global
  days: jsonb("days").$type<string[]>().default(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]),
  periods: integer("periods").default(6),
  dayStart: varchar("day_start", { length: 5 }).default("08:00"),
  periodDur: integer("period_dur").default(60),
  recess: integer("recess").default(3),
  recessDur: integer("recess_dur").default(30),
  dailyPeriods: jsonb("daily_periods").$type<Record<string, number>>().default({}),
  hideSaturday: boolean("hide_saturday").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timetableEntriesRelations = relations(timetableEntries, ({ one }) => ({
  class: one(schoolClasses, {
    fields: [timetableEntries.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [timetableEntries.subjectId],
    references: [schoolSubjects.id],
  }),
  teacher: one(employees, {
    fields: [timetableEntries.employeeId],
    references: [employees.id],
  }),
}));
