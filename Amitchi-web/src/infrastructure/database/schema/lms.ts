import { pgTable, serial, varchar, text, timestamp, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schoolClasses, schoolSubjects } from "./academics";
import { students } from "./students";
import { employees } from "./hr";

export const lmsCourses = pgTable("lms_courses", {
  id: serial("id").primaryKey(),
  courseCode: varchar("course_code", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id").references(() => employees.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("Draft"), // Draft, Published, Archived
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsModules = pgTable("lms_modules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  status: varchar("status", { length: 20 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsLessons = pgTable("lms_lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  module: varchar("module", { length: 255 }), // Left for compatibility
  moduleId: integer("module_id").references(() => lmsModules.id, { onDelete: "cascade" }),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "set null" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  content: text("content"),
  filePath: text("file_path"),
  videoUrl: text("video_url"),
  contentType: varchar("content_type", { length: 50 }).default("Text"), // Text, PDF, Video, Audio, Link, Exercise, Quiz
  duration: integer("duration").default(15), // estimated minutes
  displayOrder: integer("display_order").default(0),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsResources = pgTable("lms_resources", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lmsLessons.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }),
  filePath: text("file_path"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsEnrollments = pgTable("lms_enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("Active"), // Active, Completed, Dropped
  enrolledAt: timestamp("enrolled_at").defaultNow(),
});

export const lmsProgress = pgTable("lms_progress", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").references(() => lmsLessons.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  lastPosition: integer("last_position").default(0), // for video tracking
  personalNotes: text("personal_notes"),
});

export const lmsVirtualClasses = pgTable("lms_virtual_classes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "set null" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  teacherId: integer("teacher_id").references(() => employees.id, { onDelete: "set null" }),
  sessionDate: timestamp("session_date").notNull(),
  duration: integer("duration").default(45), // minutes
  meetingUrl: text("meeting_url").notNull(),
  meetingPassword: varchar("meeting_password", { length: 50 }),
  status: varchar("status", { length: 20 }).default("À venir"), // À venir, Terminée, Annulée
  platform: varchar("platform", { length: 50 }).default("Google Meet"), // Zoom, Google Meet, Teams, Custom
  recordingUrl: text("recording_url"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsVirtualAttendance = pgTable("lms_virtual_attendance", {
  id: serial("id").primaryKey(),
  virtualClassId: integer("virtual_class_id").references(() => lmsVirtualClasses.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("Present"), // Present, Absent, Tardy
  joinedAt: timestamp("joined_at").defaultNow(),
  durationMinutes: integer("duration_minutes").default(0),
});

export const lmsAssignments = pgTable("lms_assignments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "set null" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }), // Nullable: for individual remediation homework
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileSujetPath: text("file_sujet_path"),
  dueDate: timestamp("due_date").notNull(),
  maxScore: doublePrecision("max_score").default(20.0),
  status: varchar("status", { length: 20 }).default("Active"), // Active, Closed
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsSubmissions = pgTable("lms_submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => lmsAssignments.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  fileReponsePath: text("file_reponse_path"),
  score: doublePrecision("score"),
  comment: text("comment"),
  isGraded: boolean("is_graded").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

export const lmsQuizzes = pgTable("lms_quizzes", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  durationMin: integer("duration_min").default(20),
  maxAttempts: integer("max_attempts").default(1),
  passingScore: doublePrecision("passing_score").default(10.0),
  status: varchar("status", { length: 20 }).default("Draft"), // Draft, Active, Closed
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsQuestions = pgTable("lms_questions", {
  id: serial("id").primaryKey(),
  quizId: integer("quiz_id").references(() => lmsQuizzes.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 50 }).default("QCM"), // QCM, Vrai/Faux, ShortAnswer, OpenAnswer
  points: doublePrecision("points").default(2.0),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsAnswers = pgTable("lms_answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => lmsQuestions.id, { onDelete: "cascade" }),
  answerText: text("answer_text").notNull(),
  isCorrect: boolean("is_correct").default(false),
  explanation: text("explanation"),
});

export const lmsDiscussions = pgTable("lms_discussions", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").references(() => lmsLessons.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsCertificates = pgTable("lms_certificates", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => lmsCourses.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  issueDate: timestamp("issue_date").defaultNow(),
  certificateCode: varchar("certificate_code", { length: 100 }).notNull(),
});

// relations definitions
export const lmsCoursesRelations = relations(lmsCourses, ({ one, many }) => ({
  class: one(schoolClasses, { fields: [lmsCourses.classId], references: [schoolClasses.id] }),
  subject: one(schoolSubjects, { fields: [lmsCourses.subjectId], references: [schoolSubjects.id] }),
  teacher: one(employees, { fields: [lmsCourses.teacherId], references: [employees.id] }),
  modules: many(lmsModules),
  lessons: many(lmsLessons),
  enrollments: many(lmsEnrollments),
  assignments: many(lmsAssignments),
  quizzes: many(lmsQuizzes),
}));

export const lmsModulesRelations = relations(lmsModules, ({ one, many }) => ({
  course: one(lmsCourses, { fields: [lmsModules.courseId], references: [lmsCourses.id] }),
  lessons: many(lmsLessons),
}));

export const lmsLessonsRelations = relations(lmsLessons, ({ one, many }) => ({
  class: one(schoolClasses, { fields: [lmsLessons.classId], references: [schoolClasses.id] }),
  subject: one(schoolSubjects, { fields: [lmsLessons.subjectId], references: [schoolSubjects.id] }),
  course: one(lmsCourses, { fields: [lmsLessons.courseId], references: [lmsCourses.id] }),
  module: one(lmsModules, { fields: [lmsLessons.moduleId], references: [lmsModules.id] }),
  resources: many(lmsResources),
  progress: many(lmsProgress),
  discussions: many(lmsDiscussions),
}));

export const lmsResourcesRelations = relations(lmsResources, ({ one }) => ({
  lesson: one(lmsLessons, { fields: [lmsResources.lessonId], references: [lmsLessons.id] }),
}));

export const lmsEnrollmentsRelations = relations(lmsEnrollments, ({ one }) => ({
  course: one(lmsCourses, { fields: [lmsEnrollments.courseId], references: [lmsCourses.id] }),
  student: one(students, { fields: [lmsEnrollments.studentId], references: [students.id] }),
}));

export const lmsProgressRelations = relations(lmsProgress, ({ one }) => ({
  student: one(students, { fields: [lmsProgress.studentId], references: [students.id] }),
  lesson: one(lmsLessons, { fields: [lmsProgress.lessonId], references: [lmsLessons.id] }),
}));

export const lmsVirtualClassesRelations = relations(lmsVirtualClasses, ({ one, many }) => ({
  class: one(schoolClasses, { fields: [lmsVirtualClasses.classId], references: [schoolClasses.id] }),
  subject: one(schoolSubjects, { fields: [lmsVirtualClasses.subjectId], references: [schoolSubjects.id] }),
  teacher: one(employees, { fields: [lmsVirtualClasses.teacherId], references: [employees.id] }),
  attendance: many(lmsVirtualAttendance),
}));

export const lmsVirtualAttendanceRelations = relations(lmsVirtualAttendance, ({ one }) => ({
  virtualClass: one(lmsVirtualClasses, { fields: [lmsVirtualAttendance.virtualClassId], references: [lmsVirtualClasses.id] }),
  student: one(students, { fields: [lmsVirtualAttendance.studentId], references: [students.id] }),
}));

export const lmsAssignmentsRelations = relations(lmsAssignments, ({ one, many }) => ({
  course: one(lmsCourses, { fields: [lmsAssignments.courseId], references: [lmsCourses.id] }),
  class: one(schoolClasses, { fields: [lmsAssignments.classId], references: [schoolClasses.id] }),
  subject: one(schoolSubjects, { fields: [lmsAssignments.subjectId], references: [schoolSubjects.id] }),
  submissions: many(lmsSubmissions),
}));

export const lmsSubmissionsRelations = relations(lmsSubmissions, ({ one }) => ({
  assignment: one(lmsAssignments, { fields: [lmsSubmissions.assignmentId], references: [lmsAssignments.id] }),
  student: one(students, { fields: [lmsSubmissions.studentId], references: [students.id] }),
}));

export const lmsQuizzesRelations = relations(lmsQuizzes, ({ one, many }) => ({
  course: one(lmsCourses, { fields: [lmsQuizzes.courseId], references: [lmsCourses.id] }),
  questions: many(lmsQuestions),
}));

export const lmsQuestionsRelations = relations(lmsQuestions, ({ one, many }) => ({
  quiz: one(lmsQuizzes, { fields: [lmsQuestions.quizId], references: [lmsQuizzes.id] }),
  answers: many(lmsAnswers),
}));

export const lmsAnswersRelations = relations(lmsAnswers, ({ one }) => ({
  question: one(lmsQuestions, { fields: [lmsAnswers.questionId], references: [lmsQuestions.id] }),
}));

export const lmsDiscussionsRelations = relations(lmsDiscussions, ({ one }) => ({
  course: one(lmsCourses, { fields: [lmsDiscussions.courseId], references: [lmsCourses.id] }),
  lesson: one(lmsLessons, { fields: [lmsDiscussions.lessonId], references: [lmsLessons.id] }),
  student: one(students, { fields: [lmsDiscussions.studentId], references: [students.id] }),
  employee: one(employees, { fields: [lmsDiscussions.employeeId], references: [employees.id] }),
}));

export const lmsCertificatesRelations = relations(lmsCertificates, ({ one }) => ({
  course: one(lmsCourses, { fields: [lmsCertificates.courseId], references: [lmsCourses.id] }),
  student: one(students, { fields: [lmsCertificates.studentId], references: [students.id] }),
}));
