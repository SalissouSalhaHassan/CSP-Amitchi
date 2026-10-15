import { pgTable, serial, varchar, timestamp, boolean, doublePrecision, integer, text, unique, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { employees } from "./hr";
import { schools } from "./auth";

export const schoolSessions = pgTable("school_sessions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  sessionName: varchar("session_name", { length: 50 }).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("Actif"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.schoolId, t.sessionName)
}));

export const academicPeriods = pgTable("academic_periods", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 100 }).notNull(),
  periodType: varchar("period_type", { length: 50 }).notNull(), // "Trimestre" or "Semestre"
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  gradesDeadline: timestamp("grades_deadline"),
  isLocked: boolean("is_locked").default(false),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const educationalLevels = pgTable("educational_levels", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  levelName: varchar("level_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  unq: unique().on(t.schoolId, t.levelName)
}));

export const schoolSections = pgTable("school_sections", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  sectionName: varchar("section_name", { length: 100 }).notNull(),
  educationalLevel: varchar("educational_level", { length: 50 }).default("Lycée"),
  series: varchar("series", { length: 50 }),
  description: text("description"),
  numTerms: integer("num_terms").default(3),
  minPassingGrade: doublePrecision("min_passing_grade").default(10.0),
  redoublementThreshold: doublePrecision("redoublement_threshold").default(8.0),
  exclusionThreshold: doublePrecision("exclusion_threshold").default(5.0),
  maxRedoublement: integer("max_redoublement").default(2),
  termLabels: varchar("term_labels", { length: 255 }), // e.g. "1er Trimestre, 2ème Trimestre, 3ème Trimestre"
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolClasses = pgTable("school_classes", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  className: varchar("class_name", { length: 100 }).notNull(),
  sectionId: integer("section_id").references(() => schoolSections.id),
  roomName: varchar("room_name", { length: 100 }),
  scolariteMensuelle: doublePrecision("scolarite_mensuelle").default(0.0),
  droitsInscription: doublePrecision("droits_inscription").default(0.0),
  cogesCarteId: doublePrecision("coges_carte_id").default(0.0),
  transportInternat: doublePrecision("transport_internat").default(0.0),
  ancienSolde: doublePrecision("ancien_solde").default(0.0),
  statutInitial: varchar("statut_initial", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolSubjects = pgTable("school_subjects", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  subjectName: varchar("subject_name", { length: 100 }).notNull(),
  subjectCode: varchar("subject_code", { length: 50 }),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const classSubjects = pgTable("class_subjects", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  classId: integer("class_id").references(() => schoolClasses.id),
  subjectId: integer("subject_id").references(() => schoolSubjects.id),
  employeeId: integer("employee_id"), // ID of the teacher
  coefficient: integer("coefficient").default(1),
  credits: doublePrecision("credits").default(0.0),
  semester: varchar("semester", { length: 50 }),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  examName: varchar("exam_name", { length: 200 }).notNull(),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  examDate: timestamp("exam_date"),
  periodId: integer("period_id").references(() => academicPeriods.id),
  maxMarks: doublePrecision("max_marks").default(20),
  createdAt: timestamp("created_at").defaultNow(),
});

export const examResults = pgTable("exam_results", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  examId: integer("exam_id").references(() => exams.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  marksObtained: doublePrecision("marks_obtained"),
  remarks: text("remarks"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const schoolClassesRelations = relations(schoolClasses, ({ one, many }) => ({
  section: one(schoolSections, {
    fields: [schoolClasses.sectionId],
    references: [schoolSections.id],
  }),
  subjects: many(classSubjects),
  exams: many(exams),
}));

export const classSubjectsRelations = relations(classSubjects, ({ one }) => ({
  class: one(schoolClasses, {
    fields: [classSubjects.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [classSubjects.subjectId],
    references: [schoolSubjects.id],
  }),
  teacher: one(employees, {
    fields: [classSubjects.employeeId],
    references: [employees.id],
  }),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  class: one(schoolClasses, {
    fields: [exams.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [exams.subjectId],
    references: [schoolSubjects.id],
  }),
  period: one(academicPeriods, {
    fields: [exams.periodId],
    references: [academicPeriods.id],
  }),
  results: many(examResults),
}));

export const sectionSubjects = pgTable("section_subjects", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => schoolSections.id),
  subjectId: integer("subject_id").references(() => schoolSubjects.id),
  term: varchar("term", { length: 50 }),
  defaultCoef: integer("default_coef").default(1),
  credits: doublePrecision("credits").default(0.0),
  isEliminatory: boolean("is_eliminatory").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const examResultsRelations = relations(examResults, ({ one }) => ({
  exam: one(exams, {
    fields: [examResults.examId],
    references: [exams.id],
  }),
  student: one(students, {
    fields: [examResults.studentId],
    references: [students.id],
  }),
}));

export const schoolSessionsRelations = relations(schoolSessions, ({ many }) => ({
  periods: many(academicPeriods),
}));

export const academicPeriodsRelations = relations(academicPeriods, ({ one }) => ({
  session: one(schoolSessions, {
    fields: [academicPeriods.sessionId],
    references: [schoolSessions.id],
  }),
}));

export const schoolSectionsRelations = relations(schoolSections, ({ many }) => ({
  classes: many(schoolClasses),
  subjectLinks: many(sectionSubjects),
}));

export const schoolSubjectsRelations = relations(schoolSubjects, ({ many }) => ({
  classLinks: many(classSubjects),
  sectionLinks: many(sectionSubjects),
}));

export const sectionSubjectsRelations = relations(sectionSubjects, ({ one }) => ({
  section: one(schoolSections, {
    fields: [sectionSubjects.sectionId],
    references: [schoolSections.id],
  }),
  subject: one(schoolSubjects, {
    fields: [sectionSubjects.subjectId],
    references: [schoolSubjects.id],
  }),
}));

export const gradingAppreciations = pgTable("grading_appreciations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  baseScore: doublePrecision("base_score").default(0.0),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolRemarks = pgTable("school_remarks", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(),
  content: varchar("content", { length: 100 }).notNull(),
  score: doublePrecision("score").default(0.0),
  isChecked: boolean("is_checked").default(false),
  sectionId: integer("section_id").references(() => schoolSections.id),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const schoolRemarksRelations = relations(schoolRemarks, ({ one }) => ({
  section: one(schoolSections, {
    fields: [schoolRemarks.sectionId],
    references: [schoolSections.id],
  }),
}));

export const timetableSettings = pgTable("timetable_settings", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => schoolClasses.id), // Null for global settings
  days: text("days").notNull().default("Lundi,Mardi,Mercredi,Jeudi,Vendredi"),
  periods: integer("periods").notNull().default(6),
  recessAfter: integer("recess_after").default(3), // After period X
  recessDuration: integer("recess_duration").default(30), // minutes
  periodDuration: integer("period_duration").default(60), // minutes
  dayStart: varchar("day_start", { length: 5 }).default("08:00"),
  hideSaturday: boolean("hide_saturday").default(true),
  dailyPeriods: text("daily_periods"), // JSON string like {"Lundi": 6, ...}
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teacherConstraints = pgTable("teacher_constraints", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  offDays: text("off_days"), // Comma separated
  maxPeriodsPerDay: integer("max_periods_per_day").default(5),
  forceConsecutive: boolean("force_consecutive").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timetableEntries = pgTable("timetable_entries", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  dayName: varchar("day_name", { length: 50 }).notNull(),
  periodNumber: integer("period_number").notNull(),
  roomName: varchar("room_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
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

export const teacherConstraintsRelations = relations(teacherConstraints, ({ one }) => ({
  employee: one(employees, {
    fields: [teacherConstraints.employeeId],
    references: [employees.id],
  }),
}));

export const studentResults = pgTable("student_results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  term: varchar("term", { length: 50 }).notNull(),
  
  classWorkScore: doublePrecision("class_work_score").default(0.0),
  examScore: doublePrecision("exam_score").default(0.0),
  totalScore: doublePrecision("total_score").default(0.0),
  coefficient: integer("coefficient").default(1),
  weightedScore: doublePrecision("weighted_score").default(0.0),
  
  // Detailed Devoirs (Assessments)
  devoir1: doublePrecision("devoir1"),
  devoir2: doublePrecision("devoir2"),
  devoir3: doublePrecision("devoir3"),
  devoir4: doublePrecision("devoir4"),
  devoir5: doublePrecision("devoir5"),
  moyenneDevoirs: doublePrecision("moyenne_devoirs").default(0.0),

  absences: integer("absences").default(0),
  observation: text("observation"),
  appreciation: varchar("appreciation", { length: 100 }),
  rank: varchar("rank", { length: 20 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const studentTermSummaries = pgTable("student_term_summaries", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  term: varchar("term", { length: 50 }).notNull(),
  
  conduite: doublePrecision("conduite").default(0.0),
  travail: varchar("travail", { length: 100 }),
  tableauHonneur: boolean("tableau_honneur").default(false),
  assiduite: varchar("assiduite", { length: 100 }),
  observation: text("observation"),
  
  average: doublePrecision("average").default(0.0),
  rank: varchar("rank", { length: 20 }),
  decision: varchar("decision", { length: 100 }),
  targetClassId: integer("target_class_id").references(() => schoolClasses.id),
  targetClassName: varchar("target_class_name", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentResultsRelations = relations(studentResults, ({ one }) => ({
  student: one(students, {
    fields: [studentResults.studentId],
    references: [students.id],
  }),
  subject: one(schoolSubjects, {
    fields: [studentResults.subjectId],
    references: [schoolSubjects.id],
  }),
  class: one(schoolClasses, {
    fields: [studentResults.classId],
    references: [schoolClasses.id],
  }),
  session: one(schoolSessions, {
    fields: [studentResults.sessionId],
    references: [schoolSessions.id],
  }),
}));

export const studentTermSummariesRelations = relations(studentTermSummaries, ({ one }) => ({
  student: one(students, {
    fields: [studentTermSummaries.studentId],
    references: [students.id],
  }),
  class: one(schoolClasses, {
    fields: [studentTermSummaries.classId],
    references: [schoolClasses.id],
  }),
  session: one(schoolSessions, {
    fields: [studentTermSummaries.sessionId],
    references: [schoolSessions.id],
  }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  constraints: many(teacherConstraints),
}));

export const graduationProjects = pgTable("graduation_projects", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  projectCode: varchar("project_code", { length: 50 }),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary"),
  keywords: varchar("keywords", { length: 500 }),
  department: varchar("department", { length: 100 }),
  filiere: varchar("filiere", { length: 100 }),
  niveau: varchar("niveau", { length: 50 }), // Licence, Master, Doctorat
  language: varchar("language", { length: 30 }).default("Français"),
  academicYear: varchar("academic_year", { length: 20 }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  supervisorId: integer("supervisor_id").references(() => employees.id, { onDelete: "set null" }),
  // Jury
  presidentId: integer("president_id").references(() => employees.id),
  examinerId: integer("examiner_id").references(() => employees.id),
  rapporteurId: integer("rapporteur_id").references(() => employees.id),
  secretaryId: integer("secretary_id").references(() => employees.id),
  // Defense scheduling
  defenseDate: timestamp("defense_date"),
  defenseEndTime: timestamp("defense_end_time"),
  roomName: varchar("room_name", { length: 100 }),
  defenseDurationMins: integer("defense_duration_mins").default(60),
  // Workflow: Proposition|Validation|Encadrement|Pré-soutenance|Correction|Soutenance|Délibération|Validation Finale|Archivage
  status: varchar("status", { length: 50 }).default("Proposition"),
  progressPercent: integer("progress_percent").default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  // Evaluation
  grade: doublePrecision("grade"),
  mention: varchar("mention", { length: 50 }), // Très Bien, Bien, Assez Bien, Passable, Insuffisant
  decision: varchar("decision", { length: 50 }), // Validé, Refusé, Ajourné
  // Archive
  archiveRef: varchar("archive_ref", { length: 100 }),
  archiveUrl: varchar("archive_url", { length: 500 }),
  isDistinguished: boolean("is_distinguished").default(false),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents liés à chaque projet
export const graduationDocuments = pgTable("graduation_documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => graduationProjects.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").references(() => schools.id),
  docType: varchar("doc_type", { length: 50 }).notNull(), // Proposition, Cahier des charges, Rapport PDF, Présentation PPT, Annexes, Code Source, Dataset, Vidéo
  title: varchar("title", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }),
  version: varchar("version", { length: 20 }).default("v1.0"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  notes: text("notes"),
});

// Salles de soutenance
export const graduationDefenseRooms = pgTable("graduation_defense_rooms", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  roomName: varchar("room_name", { length: 100 }).notNull(),
  capacity: integer("capacity").default(30),
  equipment: text("equipment"),
  location: varchar("location", { length: 255 }),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Évaluations détaillées du jury par critère
export const graduationJuryEvaluations = pgTable("graduation_jury_evaluations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => graduationProjects.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").references(() => schools.id),
  scienceQuality: doublePrecision("science_quality"), // /20
  methodology: doublePrecision("methodology"),        // /20
  presentation: doublePrecision("presentation"),      // /20
  innovation: doublePrecision("innovation"),           // /20
  questions: doublePrecision("questions"),             // /20
  average: doublePrecision("average"),                 // moyenne calculée
  mention: varchar("mention", { length: 50 }),
  decision: varchar("decision", { length: 50 }),
  juryComments: text("jury_comments"),
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
});

// Journal de workflow (historique des changements de statut)
export const graduationWorkflowLogs = pgTable("graduation_workflow_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => graduationProjects.id, { onDelete: "cascade" }),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }),
  changedAt: timestamp("changed_at").defaultNow(),
  notes: text("notes"),
});

// Archives numériques
export const graduationArchives = pgTable("graduation_archives", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => graduationProjects.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").references(() => schools.id),
  archiveRef: varchar("archive_ref", { length: 100 }).notNull(),
  qrCodeUrl: varchar("qr_code_url", { length: 500 }),
  permanentLink: varchar("permanent_link", { length: 500 }),
  reportUrl: varchar("report_url", { length: 500 }),
  presentationUrl: varchar("presentation_url", { length: 500 }),
  codeUrl: varchar("code_url", { length: 500 }),
  archivedAt: timestamp("archived_at").defaultNow(),
});

// ─── RELATIONS ───────────────────────────────────────────────────────────────

export const graduationProjectsRelations = relations(graduationProjects, ({ one, many }) => ({
  student: one(students, {
    fields: [graduationProjects.studentId],
    references: [students.id],
  }),
  supervisor: one(employees, {
    fields: [graduationProjects.supervisorId],
    references: [employees.id],
    relationName: "gp_supervisor",
  }),
  president: one(employees, {
    fields: [graduationProjects.presidentId],
    references: [employees.id],
    relationName: "gp_president",
  }),
  examiner: one(employees, {
    fields: [graduationProjects.examinerId],
    references: [employees.id],
    relationName: "gp_examiner",
  }),
  rapporteur: one(employees, {
    fields: [graduationProjects.rapporteurId],
    references: [employees.id],
    relationName: "gp_rapporteur",
  }),
  secretary: one(employees, {
    fields: [graduationProjects.secretaryId],
    references: [employees.id],
    relationName: "gp_secretary",
  }),
  documents: many(graduationDocuments),
  evaluations: many(graduationJuryEvaluations),
  workflowLogs: many(graduationWorkflowLogs),
  archive: one(graduationArchives, {
    fields: [graduationProjects.id],
    references: [graduationArchives.projectId],
  }),
}));

export const graduationDocumentsRelations = relations(graduationDocuments, ({ one }) => ({
  project: one(graduationProjects, {
    fields: [graduationDocuments.projectId],
    references: [graduationProjects.id],
  }),
}));

export const graduationJuryEvaluationsRelations = relations(graduationJuryEvaluations, ({ one }) => ({
  project: one(graduationProjects, {
    fields: [graduationJuryEvaluations.projectId],
    references: [graduationProjects.id],
  }),
}));

export const graduationWorkflowLogsRelations = relations(graduationWorkflowLogs, ({ one }) => ({
  project: one(graduationProjects, {
    fields: [graduationWorkflowLogs.projectId],
    references: [graduationProjects.id],
  }),
}));

export const graduationArchivesRelations = relations(graduationArchives, ({ one }) => ({
  project: one(graduationProjects, {
    fields: [graduationArchives.projectId],
    references: [graduationProjects.id],
  }),
}));

export const graduationDefenseRoomsRelations = relations(graduationDefenseRooms, ({ one }) => ({
  school: one(schools, {
    fields: [graduationDefenseRooms.schoolId],
    references: [schools.id],
  }),
}));

// --- PEDAGOGICAL UNITS (UP) ---
export const pedagogicalUnits = pgTable("pedagogical_units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  educationalLevel: varchar("educational_level", { length: 100 }),
  leadTeacherId: integer("lead_teacher_id").references(() => employees.id, { onDelete: "set null" }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pedagogicalUnitMembers = pgTable("pedagogical_unit_members", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => pedagogicalUnits.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const pedagogicalUnitsRelations = relations(pedagogicalUnits, ({ one, many }) => ({
  subject: one(schoolSubjects, {
    fields: [pedagogicalUnits.subjectId],
    references: [schoolSubjects.id],
  }),
  leadTeacher: one(employees, {
    fields: [pedagogicalUnits.leadTeacherId],
    references: [employees.id],
  }),
  members: many(pedagogicalUnitMembers),
}));

export const pedagogicalUnitMembersRelations = relations(pedagogicalUnitMembers, ({ one }) => ({
  unit: one(pedagogicalUnits, {
    fields: [pedagogicalUnitMembers.unitId],
    references: [pedagogicalUnits.id],
  }),
  teacher: one(employees, {
    fields: [pedagogicalUnitMembers.employeeId],
    references: [employees.id],
  }),
}));

// --- TEACHER CLASS SUBJECTS ---
export const teacherClassSubjects = pgTable("teacher_class_subjects", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  isPrincipalTeacher: boolean("is_principal_teacher").default(false),
  coefficient: integer("coefficient").default(1),
  weeklyHours: doublePrecision("weekly_hours").default(0.0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teacherClassSubjectsRelations = relations(teacherClassSubjects, ({ one }) => ({
  school: one(schools, {
    fields: [teacherClassSubjects.schoolId],
    references: [schools.id],
  }),
  employee: one(employees, {
    fields: [teacherClassSubjects.employeeId],
    references: [employees.id],
  }),
  class: one(schoolClasses, {
    fields: [teacherClassSubjects.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [teacherClassSubjects.subjectId],
    references: [schoolSubjects.id],
  }),
  session: one(schoolSessions, {
    fields: [teacherClassSubjects.sessionId],
    references: [schoolSessions.id],
  }),
}));

// --- RESULTS WORKFLOWS ---
export const resultsWorkflows = pgTable("results_workflows", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  period: varchar("period", { length: 100 }).notNull(), // e.g. "1er Trimestre"
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }), // optional
  teacherId: integer("teacher_id").references(() => employees.id, { onDelete: "set null" }), // optional
  status: varchar("status", { length: 50 }).notNull().default("BROUILLON"),
  submittedBy: integer("submitted_by").references(() => employees.id),
  submittedAt: timestamp("submitted_at"),
  controlledBy: integer("controlled_by").references(() => employees.id),
  controlledAt: timestamp("controlled_at"),
  validatedBy: integer("validated_by").references(() => employees.id),
  validatedAt: timestamp("validated_at"),
  lockedBy: integer("locked_by").references(() => employees.id),
  lockedAt: timestamp("locked_at"),
  publishedBy: integer("published_by").references(() => employees.id),
  publishedAt: timestamp("published_at"),
  observation: text("observation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const resultsWorkflowsRelations = relations(resultsWorkflows, ({ one }) => ({
  school: one(schools, {
    fields: [resultsWorkflows.schoolId],
    references: [schools.id],
  }),
  session: one(schoolSessions, {
    fields: [resultsWorkflows.sessionId],
    references: [schoolSessions.id],
  }),
  class: one(schoolClasses, {
    fields: [resultsWorkflows.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [resultsWorkflows.subjectId],
    references: [schoolSubjects.id],
  }),
  teacher: one(employees, {
    fields: [resultsWorkflows.teacherId],
    references: [employees.id],
  }),
}));

export const officialRectifications = pgTable("official_rectifications", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  reason: text("reason").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  requestedBy: integer("requested_by"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const officialRectificationsRelations = relations(officialRectifications, ({ one }) => ({
  school: one(schools, {
    fields: [officialRectifications.schoolId],
    references: [schools.id],
  }),
  session: one(schoolSessions, {
    fields: [officialRectifications.sessionId],
    references: [schoolSessions.id],
  }),
}));

export const officialTemplates = pgTable("official_templates", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  pageSize: varchar("page_size", { length: 20 }).default("A4"),
  orientation: varchar("orientation", { length: 20 }).default("portrait"),
  jsonDesign: jsonb("json_design"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cardTemplates = pgTable("card_templates", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 150 }).notNull(),
  description: text("description"),
  cardType: varchar("card_type", { length: 30 }).default("CR80"),
  orientation: varchar("orientation", { length: 20 }).default("landscape"),
  rectoDesign: jsonb("recto_design"),
  versoDesign: jsonb("verso_design"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const periodExtensionRequests = pgTable("period_extension_requests", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  periodId: integer("period_id").references(() => academicPeriods.id),
  periodName: varchar("period_name", { length: 100 }),
  teacherId: integer("teacher_id"),
  teacherName: varchar("teacher_name", { length: 150 }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("En attente"),
  requestedAt: timestamp("requested_at").defaultNow(),
  handledAt: timestamp("handled_at"),
});

/**
 * bulletin_records — سجل الكشوف الرسمي
 * يُخزّن كل كشف مُولَّد مع:
 *  - رابط PDF في Supabase Storage
 *  - verify_token فريد للتحقق عبر QR
 *  - الحالة: validé / provisoire / annulé
 */
export const bulletinRecords = pgTable("bulletin_records", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id),
  sessionId: integer("session_id").references(() => schoolSessions.id),
  periodId: integer("period_id").references(() => academicPeriods.id),
  period: varchar("period", { length: 50 }),           // "Semestre 1", "Trimestre 2"...
  average: doublePrecision("average"),
  rank: varchar("rank", { length: 20 }),               // "1er", "3ème"
  totalStudents: integer("total_students"),
  decision: varchar("decision", { length: 200 }),      // "ADMIS(E) EN 3ème", ...
  pdfUrl: text("pdf_url"),                             // Supabase Storage signed URL
  pdfPath: text("pdf_path"),                          // chemin brut dans Storage
  verifyToken: varchar("verify_token", { length: 64 }).unique(), // UUID pour QR
  status: varchar("status", { length: 20 }).default("validé"), // validé | provisoire | annulé
  whatsappSent: boolean("whatsapp_sent").default(false),
  pushSent: boolean("push_sent").default(false),
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: varchar("generated_by", { length: 100 }),
});

export const bulletinRecordsRelations = relations(bulletinRecords, ({ one }) => ({
  student: one(students, {
    fields: [bulletinRecords.studentId],
    references: [students.id],
  }),
  class: one(schoolClasses, {
    fields: [bulletinRecords.classId],
    references: [schoolClasses.id],
  }),
  session: one(schoolSessions, {
    fields: [bulletinRecords.sessionId],
    references: [schoolSessions.id],
  }),
  period: one(academicPeriods, {
    fields: [bulletinRecords.periodId],
    references: [academicPeriods.id],
  }),
}));

// ─── LMD & HIGHER EDUCATION TABLES (Système Universitaire LMD / ECTS) ─────────

/**
 * Facultés, Instituts, Écoles ou UFR
 */
export const universityFaculties = pgTable("university_faculties", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 30 }),
  deanEmployeeId: integer("dean_employee_id").references(() => employees.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const universityFacultiesRelations = relations(universityFaculties, ({ one, many }) => ({
  school: one(schools, { fields: [universityFaculties.schoolId], references: [schools.id] }),
  dean: one(employees, { fields: [universityFaculties.deanEmployeeId], references: [employees.id] }),
  departments: many(universityDepartments),
}));

/**
 * Départements académiques au sein d'une Faculté
 */
export const universityDepartments = pgTable("university_departments", {
  id: serial("id").primaryKey(),
  facultyId: integer("faculty_id").references(() => universityFaculties.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 30 }),
  headEmployeeId: integer("head_employee_id").references(() => employees.id),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const universityDepartmentsRelations = relations(universityDepartments, ({ one, many }) => ({
  faculty: one(universityFaculties, { fields: [universityDepartments.facultyId], references: [universityFaculties.id] }),
  head: one(employees, { fields: [universityDepartments.headEmployeeId], references: [employees.id] }),
  programs: many(universityPrograms),
}));

/**
 * Filières, Parcours et Spécialités LMD (ex: Licence Informatique, Master Finance)
 */
export const universityPrograms = pgTable("university_programs", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => universityDepartments.id, { onDelete: "cascade" }),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  sectionId: integer("section_id").references(() => schoolSections.id),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 50 }),
  degreeLevel: varchar("degree_level", { length: 50 }).notNull().default("Licence"), // Licence | Master | Doctorat
  totalCredits: integer("total_credits").default(180), // 180 (Licence) | 120 (Master)
  durationSemesters: integer("duration_semesters").default(6),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const universityProgramsRelations = relations(universityPrograms, ({ one, many }) => ({
  department: one(universityDepartments, { fields: [universityPrograms.departmentId], references: [universityDepartments.id] }),
  school: one(schools, { fields: [universityPrograms.schoolId], references: [schools.id] }),
  section: one(schoolSections, { fields: [universityPrograms.sectionId], references: [schoolSections.id] }),
  unitesEnseignement: many(lmdUnitesEnseignement),
}));

/**
 * Unités d'Enseignement (UE) — 30 Crédits ECTS par Semestre
 */
export const lmdUnitesEnseignement = pgTable("lmd_unites_enseignement", {
  id: serial("id").primaryKey(),
  programId: integer("program_id").references(() => universityPrograms.id, { onDelete: "cascade" }),
  semester: varchar("semester", { length: 20 }).notNull(), // S1, S2, S3, S4, S5, S6
  codeUe: varchar("code_ue", { length: 50 }).notNull(),   // ex: INF1101, MTH1201
  nameUe: varchar("name_ue", { length: 150 }).notNull(),
  typeUe: varchar("type_ue", { length: 50 }).default("Fondamentale"), // Fondamentale | Méthodologique | Transversale | Optionnelle
  creditsEcts: doublePrecision("credits_ects").notNull().default(6.0),
  totalHours: doublePrecision("total_hours").default(60.0),
  minPassingGrade: doublePrecision("min_passing_grade").default(10.0),
  isEliminatory: boolean("is_eliminatory").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmdUnitesEnseignementRelations = relations(lmdUnitesEnseignement, ({ one, many }) => ({
  program: one(universityPrograms, { fields: [lmdUnitesEnseignement.programId], references: [universityPrograms.id] }),
  elementsConstitutifs: many(lmdElementsConstitutifs),
  studentResults: many(studentLmdUeResults),
}));

/**
 * Éléments Constitutifs d'UE (ECU / Matières)
 */
export const lmdElementsConstitutifs = pgTable("lmd_elements_constitutifs", {
  id: serial("id").primaryKey(),
  ueId: integer("ue_id").references(() => lmdUnitesEnseignement.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id),
  codeEcu: varchar("code_ecu", { length: 50 }),
  nameEcu: varchar("name_ecu", { length: 150 }).notNull(),
  creditsEcts: doublePrecision("credits_ects").default(3.0),
  coefficient: integer("coefficient").default(1),
  hoursCm: doublePrecision("hours_cm").default(24.0), // Cours Magistraux
  hoursTd: doublePrecision("hours_td").default(12.0), // Travaux Dirigés
  hoursTp: doublePrecision("hours_tp").default(0.0),  // Travaux Pratiques
  hoursTpe: doublePrecision("hours_tpe").default(24.0), // Travail Personnel
  teacherEmployeeId: integer("teacher_employee_id").references(() => employees.id),
  eliminatoryGrade: doublePrecision("eliminatory_grade").default(7.0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmdElementsConstitutifsRelations = relations(lmdElementsConstitutifs, ({ one }) => ({
  uniteEnseignement: one(lmdUnitesEnseignement, { fields: [lmdElementsConstitutifs.ueId], references: [lmdUnitesEnseignement.id] }),
  subject: one(schoolSubjects, { fields: [lmdElementsConstitutifs.subjectId], references: [schoolSubjects.id] }),
  teacher: one(employees, { fields: [lmdElementsConstitutifs.teacherEmployeeId], references: [employees.id] }),
}));

/**
 * Résultats et Capitalisation des UE par Étudiant
 */
export const studentLmdUeResults = pgTable("student_lmd_ue_results", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  ueId: integer("ue_id").references(() => lmdUnitesEnseignement.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id),
  semester: varchar("semester", { length: 20 }).notNull(),
  rawAverage: doublePrecision("raw_average"), // Note / 20
  validatedStatus: varchar("validated_status", { length: 20 }).default("NV"), // V (Validé) | VC (Validé par Compensation) | NV (Non Validé) | CAP (Capitalisé) | RAT (En Rattrapage)
  creditsAcquired: doublePrecision("credits_acquired").default(0.0),
  sessionAcquisition: varchar("session_acquisition", { length: 30 }).default("Normale"), // Normale | Rattrapage
  academicYear: varchar("academic_year", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentLmdUeResultsRelations = relations(studentLmdUeResults, ({ one }) => ({
  student: one(students, { fields: [studentLmdUeResults.studentId], references: [students.id] }),
  uniteEnseignement: one(lmdUnitesEnseignement, { fields: [studentLmdUeResults.ueId], references: [lmdUnitesEnseignement.id] }),
  session: one(schoolSessions, { fields: [studentLmdUeResults.sessionId], references: [schoolSessions.id] }),
}));

/**
 * Résultats Semestriels et Décisions LMD (30 Crédits ECTS / Semestre)
 */
export const studentLmdSemesters = pgTable("student_lmd_semesters", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  programId: integer("program_id").references(() => universityPrograms.id),
  classId: integer("class_id").references(() => schoolClasses.id),
  semester: varchar("semester", { length: 20 }).notNull(), // S1 .. S6
  sessionId: integer("session_id").references(() => schoolSessions.id),
  semesterAverage: doublePrecision("semester_average"),
  creditsAcquired: doublePrecision("credits_acquired").default(0.0), // sur 30 ECTS
  totalCreditsAccumulated: doublePrecision("total_credits_accumulated").default(0.0), // cumulé (ex: 90 / 180)
  decision: varchar("decision", { length: 100 }).default("Ajourné"), // Admis | Admis par Compensation | Ajourné | Admis avec Dettes | Enjambement
  rank: varchar("rank", { length: 20 }),
  mention: varchar("mention", { length: 50 }), // Passable | Assez Bien | Bien | Très Bien
  sessionType: varchar("session_type", { length: 30 }).default("Normale"), // Normale | Rattrapage
  juryDeliberationNotes: text("jury_deliberation_notes"),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentLmdSemestersRelations = relations(studentLmdSemesters, ({ one }) => ({
  student: one(students, { fields: [studentLmdSemesters.studentId], references: [students.id] }),
  program: one(universityPrograms, { fields: [studentLmdSemesters.programId], references: [universityPrograms.id] }),
  class: one(schoolClasses, { fields: [studentLmdSemesters.classId], references: [schoolClasses.id] }),
  session: one(schoolSessions, { fields: [studentLmdSemesters.sessionId], references: [schoolSessions.id] }),
}));

/**
 * Équivalences & Transferts de Crédits ECTS (Mobilité Internationale & Passerelles LMD)
 */
export const lmdCreditEquivalences = pgTable("lmd_credit_equivalences", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  originInstitution: varchar("origin_institution", { length: 200 }).notNull(),
  originCountry: varchar("origin_country", { length: 100 }).default("International"),
  originProgram: varchar("origin_program", { length: 200 }),
  academicYear: varchar("academic_year", { length: 50 }),
  targetProgramId: integer("target_program_id").references(() => universityPrograms.id),
  targetLevel: varchar("target_level", { length: 50 }).default("L2"), // L1, L2, L3, M1, M2
  targetSemester: varchar("target_semester", { length: 50 }).default("S3"), // S1 .. S6
  creditsTransferred: doublePrecision("credits_transferred").notNull().default(60.0), // Total ECTS
  equivalentUesJson: text("equivalent_ues_json"), // JSON stringified array of recognized UEs
  decision: varchar("decision", { length: 50 }).default("Validé"), // Validé | Rejeté | En Commission
  decisionDate: timestamp("decision_date").defaultNow(),
  commissionPresident: varchar("commission_president", { length: 150 }),
  commissionComments: text("commission_comments"),
  certificateNumber: varchar("certificate_number", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lmdCreditEquivalencesRelations = relations(lmdCreditEquivalences, ({ one }) => ({
  student: one(students, { fields: [lmdCreditEquivalences.studentId], references: [students.id] }),
  targetProgram: one(universityPrograms, { fields: [lmdCreditEquivalences.targetProgramId], references: [universityPrograms.id] }),
}));


