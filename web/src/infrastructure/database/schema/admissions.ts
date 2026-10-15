import { pgTable, serial, varchar, integer, timestamp, text, boolean, doublePrecision, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";
import { students } from "./students";

export const admissionApplications = pgTable(
  "admission_applications",
  {
    id: serial("id").primaryKey(),
    applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(), // e.g. ADM-2026-0042
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    
    // Academic Track & Higher Education Hierarchy
    educationLevel: varchar("education_level", { length: 50 }).default("Secondaire"), // 'Maternelle', 'Primaire', 'Secondaire', 'Université / Supérieur', 'Formation Professionnelle'
    faculty: varchar("faculty", { length: 150 }), // Faculté / UFR / École (e.g. Faculté des Sciences et Technologies)
    department: varchar("department", { length: 150 }), // Département (e.g. Informatique, Génie Civil, Droit)
    degreeProgram: varchar("degree_program", { length: 150 }), // Filière / Spécialité (e.g. Licence en Génie Logiciel)
    degreeLevel: varchar("degree_level", { length: 50 }), // Cycle: L1, L2, L3, M1, M2, Doctorat, BTS, Ingénierie
    studyMode: varchar("study_mode", { length: 50 }).default("Présentiel / Temps plein"), // 'Présentiel / Temps plein', 'Cours du soir', 'En ligne / Distanciel', 'Alternance'
    academicYear: varchar("academic_year", { length: 50 }).default("2026–2027"),
    targetClass: varchar("target_class", { length: 100 }).notNull(),

    // Candidate Personal Information
    studentFirstName: varchar("student_first_name", { length: 150 }).notNull(),
    studentLastName: varchar("student_last_name", { length: 150 }).notNull(),
    dateOfBirth: varchar("date_of_birth", { length: 50 }).notNull(),
    gender: varchar("gender", { length: 10 }).notNull().default("M"),
    placeOfBirth: varchar("place_of_birth", { length: 150 }),
    nationality: varchar("nationality", { length: 100 }).default("Nigérienne"),
    candidateEmail: varchar("candidate_email", { length: 150 }),
    candidatePhone: varchar("candidate_phone", { length: 50 }),
    candidateWhatsapp: varchar("candidate_whatsapp", { length: 50 }),
    address: text("address"),
    city: varchar("city", { length: 100 }).default("Niamey"),

    // Baccalaureate & Previous Academic Background
    bacSeries: varchar("bac_series", { length: 50 }), // Série C, D, A, E, F, G, etc.
    bacYear: varchar("bac_year", { length: 20 }),
    bacMention: varchar("bac_mention", { length: 50 }), // 'Très Bien', 'Bien', 'Assez Bien', 'Passable'
    bacRollNumber: varchar("bac_roll_number", { length: 100 }),
    previousSchool: varchar("previous_school", { length: 255 }),
    previousGradeAvg: varchar("previous_grade_avg", { length: 50 }),

    // Parent / Guardian / Sponsor Information
    parentName: varchar("parent_name", { length: 255 }).notNull(),
    parentRelation: varchar("parent_relation", { length: 50 }).default("Père"),
    parentPhone: varchar("parent_phone", { length: 50 }).notNull(),
    parentWhatsapp: varchar("parent_whatsapp", { length: 50 }),
    parentEmail: varchar("parent_email", { length: 150 }),
    parentProfession: varchar("parent_profession", { length: 150 }),

    // Uploaded Documents & Portfolios
    photoUrl: text("photo_url"),
    birthCertificateUrl: text("birth_certificate_url"),
    idCardPassportUrl: text("id_card_passport_url"),
    bacTranscriptUrl: text("bac_transcript_url"),
    bacCertificateUrl: text("bac_certificate_url"),
    higherEdTranscriptUrl: text("higher_ed_transcript_url"),
    cvUrl: text("cv_url"),
    coverLetter: text("cover_letter"),
    recommendationLetterUrl: text("recommendation_letter_url"),
    reportCardUrl: text("report_card_url"),
    medicalNotes: text("medical_notes"),
    paymentReceiptUrl: text("payment_receipt_url"),
    tuitionDepositPaid: boolean("tuition_deposit_paid").default(false),
    tuitionDepositReceiptUrl: text("tuition_deposit_receipt_url"),

    // Jury & Academic Committee Review Pipeline
    status: varchar("status", { length: 50 }).notNull().default("En attente"), // 'En attente', 'En examen', 'Admis / Accepté', 'Refusé', 'Liste d''attente', 'Admis sous condition'
    admissionScore: doublePrecision("admission_score"), // Score dossier /100 ou /20
    interviewScore: doublePrecision("interview_score"), // Score entretien
    interviewDate: varchar("interview_date", { length: 50 }),
    juryDecision: varchar("jury_decision", { length: 50 }),
    juryComment: text("jury_comment"),
    reviewNotes: text("review_notes"),
    reviewedBy: varchar("reviewed_by", { length: 150 }),
    reviewedAt: timestamp("reviewed_at"),

    // Conversion to Official Student
    admittedStudentId: integer("admitted_student_id").references(() => students.id, { onDelete: "set null" }),
    generatedMatricule: varchar("generated_matricule", { length: 50 }),
    parentNotified: boolean("parent_notified").default(false),
    parentNotificationSentAt: timestamp("parent_notification_sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    schoolIdIdx: index("admission_applications_school_id_idx").on(table.schoolId),
    statusIdx: index("admission_applications_status_idx").on(table.status),
    appNumberIdx: index("admission_applications_number_idx").on(table.applicationNumber),
    educationLevelIdx: index("admission_applications_education_level_idx").on(table.schoolId, table.educationLevel),
    facultyIdx: index("admission_applications_faculty_idx").on(table.schoolId, table.faculty),
    degreeProgramIdx: index("admission_applications_degree_program_idx").on(table.schoolId, table.degreeProgram),
  })
);

export const admissionApplicationsRelations = relations(admissionApplications, ({ one }) => ({
  school: one(schools, {
    fields: [admissionApplications.schoolId],
    references: [schools.id],
  }),
  admittedStudent: one(students, {
    fields: [admissionApplications.admittedStudentId],
    references: [students.id],
  }),
}));
