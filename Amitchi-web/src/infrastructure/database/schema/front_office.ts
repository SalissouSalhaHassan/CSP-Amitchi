import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const visitors = pgTable("visitor_logs", {
  id: serial("id").primaryKey(),
  visitorName: varchar("visitor_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  meetingWith: varchar("meeting_with", { length: 100 }),
  timeIn: varchar("time_in", { length: 20 }).notNull(),
  timeOut: varchar("time_out", { length: 20 }),
  date: timestamp("date").defaultNow(),
  note: text("note"),
});

export const admissionEnquiries = pgTable("admission_enquiries", {
  id: serial("id").primaryKey(),
  parentName: varchar("parent_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  childName: varchar("child_name", { length: 255 }),
  classRequested: varchar("class_requested", { length: 100 }),
  source: varchar("source", { length: 100 }),
  date: timestamp("date").defaultNow(),
  followUpDate: varchar("follow_up_date", { length: 50 }),
  status: varchar("status", { length: 50 }).default("En Attente"), // En Attente, Inscrit, Annulé
});

export const postalDispatch = pgTable("postal_dispatch", {
  id: serial("id").primaryKey(),
  recordType: varchar("record_type", { length: 20 }).notNull(), // Receive, Dispatch
  referenceNo: varchar("reference_no", { length: 100 }),
  senderReceiver: varchar("sender_receiver", { length: 255 }).notNull(),
  address: text("address"),
  date: timestamp("date").defaultNow(),
});

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").default(1),
  respondentName: varchar("respondent_name", { length: 255 }).default("Parent d'élève"),
  respondentRole: varchar("respondent_role", { length: 50 }).default("Parent"), // Parent, Student, Teacher
  overallRating: integer("overall_rating").notNull().default(5), // 1 - 5
  teachingQualityRating: integer("teaching_quality_rating").default(5),
  transportRating: integer("transport_rating").default(5),
  canteenRating: integer("canteen_rating").default(5),
  cleanlinessRating: integer("cleanliness_rating").default(5),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

