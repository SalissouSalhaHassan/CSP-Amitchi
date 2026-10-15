import { pgTable, serial, varchar, integer, timestamp, text, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schoolClasses, schoolSubjects } from "./academics";
import { students } from "./students";

export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  dateAssigned: timestamp("date_assigned").defaultNow(),
  dateDue: timestamp("date_due").notNull(),
  attachmentPath: varchar("attachment_path", { length: 500 }),
  createdBy: varchar("created_by", { length: 255 }).default("Admin"),
});

export const homeworkSubmissions = pgTable("homework_submissions", {
  id: serial("id").primaryKey(),
  homeworkId: integer("homework_id").references(() => homework.id, { onDelete: "cascade" }).notNull(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  submissionText: text("submission_text"),
  submissionAttachment: varchar("submission_attachment", { length: 500 }),
  voiceNoteUrl: varchar("voice_note_url", { length: 500 }),
  status: varchar("status", { length: 50 }).default("Rendu"), // Rendu, Corrigé, En retard
  teacherGrade: doublePrecision("teacher_grade"),
  teacherFeedback: text("teacher_feedback"),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const homeworkRelations = relations(homework, ({ one, many }) => ({
  class: one(schoolClasses, {
    fields: [homework.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [homework.subjectId],
    references: [schoolSubjects.id],
  }),
  submissions: many(homeworkSubmissions),
}));

export const homeworkSubmissionsRelations = relations(homeworkSubmissions, ({ one }) => ({
  homework: one(homework, {
    fields: [homeworkSubmissions.homeworkId],
    references: [homework.id],
  }),
  student: one(students, {
    fields: [homeworkSubmissions.studentId],
    references: [students.id],
  }),
}));

