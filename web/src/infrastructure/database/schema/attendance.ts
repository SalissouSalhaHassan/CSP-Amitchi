import { pgTable, serial, varchar, integer, timestamp, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schoolClasses, schoolSubjects, timetableEntries } from "./academics";
import { employees } from "./hr";
import { schools } from "./auth";

export const studentAttendance = pgTable("student_attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }), // Teacher who took the attendance
  date: timestamp("date").defaultNow(),
  status: varchar("status", { length: 50 }).notNull().default("Présent"), // Présent, Absent, En Retard, Excusé
  remark: text("remark"),
  recordedBy: varchar("recorded_by", { length: 255 }).default("Admin"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => {
  return {
    schoolIdx: index("attendance_school_idx").on(table.schoolId),
    studentIdx: index("attendance_student_idx").on(table.studentId),
    classIdx: index("attendance_class_idx").on(table.classId),
    dateIdx: index("attendance_date_idx").on(table.date),
    subjectIdx: index("attendance_subject_idx").on(table.subjectId),
    updatedIdx: index("attendance_updated_idx").on(table.schoolId, table.updatedAt),
  };
});

export const studentAttendanceRelations = relations(studentAttendance, ({ one }) => ({
  school: one(schools, {
    fields: [studentAttendance.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [studentAttendance.studentId],
    references: [students.id],
  }),
  class: one(schoolClasses, {
    fields: [studentAttendance.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [studentAttendance.subjectId],
    references: [schoolSubjects.id],
  }),
  teacher: one(employees, {
    fields: [studentAttendance.employeeId],
    references: [employees.id],
  }),
}));

export const teacherSessionAttendance = pgTable("teacher_session_attendance", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  timetableEntryId: integer("timetable_entry_id").references(() => timetableEntries.id, { onDelete: "set null" }),
  date: timestamp("date").defaultNow(),
  periodNumber: integer("period_number").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("Présent"), // Présent, Absent, En Retard
  scannedAt: timestamp("scanned_at").defaultNow(),
  scanMethod: varchar("scan_method", { length: 50 }).default("QR_CODE"), // QR_CODE, MANUAL
  remarques: text("remarques"),
}, (table) => {
  return {
    schoolIdx: index("teacher_att_school_idx").on(table.schoolId),
    employeeIdx: index("teacher_att_emp_idx").on(table.employeeId),
    classIdx: index("teacher_att_class_idx").on(table.classId),
    dateIdx: index("teacher_att_date_idx").on(table.date),
  };
});

export const teacherSessionAttendanceRelations = relations(teacherSessionAttendance, ({ one }) => ({
  school: one(schools, {
    fields: [teacherSessionAttendance.schoolId],
    references: [schools.id],
  }),
  employee: one(employees, {
    fields: [teacherSessionAttendance.employeeId],
    references: [employees.id],
  }),
  class: one(schoolClasses, {
    fields: [teacherSessionAttendance.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [teacherSessionAttendance.subjectId],
    references: [schoolSubjects.id],
  }),
  timetableEntry: one(timetableEntries, {
    fields: [teacherSessionAttendance.timetableEntryId],
    references: [timetableEntries.id],
  }),
}));

