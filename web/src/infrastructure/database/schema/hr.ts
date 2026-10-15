import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // SaaS isolation
  empId: varchar("emp_id", { length: 50 }).notNull(),
  nom: varchar("nom", { length: 100 }).notNull(),
  poste: varchar("poste", { length: 100 }),
  departement: varchar("departement", { length: 100 }),
  mobile: varchar("mobile", { length: 20 }),
  email: varchar("email", { length: 100 }),
  dateEmbauche: varchar("date_embauche", { length: 20 }),
  salaireBase: doublePrecision("salaire_base").default(0.0),
  sexe: varchar("sexe", { length: 20 }),
  dateNaissance: varchar("date_naissance", { length: 20 }),
  cnic: varchar("cnic", { length: 50 }),
  adresse: text("adresse"),
  banqueNom: varchar("banque_nom", { length: 100 }),
  banqueCompte: varchar("banque_compte", { length: 100 }),
  statut: varchar("statut", { length: 20 }).default("Actif"),
  photoPath: varchar("photo_path", { length: 255 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  lieuNaissance: varchar("lieu_naissance", { length: 100 }),
  codeGrade: varchar("code_grade", { length: 50 }),
  categorie: varchar("categorie", { length: 50 }),
  classe: varchar("classe", { length: 50 }),
  echelon: varchar("echelon", { length: 50 }),
  fonction: varchar("fonction", { length: 100 }),
  dateNomination: varchar("date_nomination", { length: 50 }),
  lieuAffectation: varchar("lieu_affectation", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  region: varchar("region", { length: 100 }),
  dateAffectation: varchar("date_affectation", { length: 50 }),
  activationPin: varchar("activation_pin", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("employees_school_id_idx").on(table.schoolId),
  schoolLevelIdx: index("employees_school_level_idx").on(table.schoolId, table.educationalLevel),
  schoolDeptIdx: index("employees_school_dept_idx").on(table.schoolId, table.departement),
  schoolStatusIdx: index("employees_school_status_idx").on(table.schoolId, table.statut),
  schoolCreatedIdx: index("employees_school_created_idx").on(table.schoolId, table.createdAt),
  unqSchoolEmpId: unique().on(table.schoolId, table.empId),
}));

export const employeeAttendance = pgTable("employee_attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow(),
  periodNumber: integer("period_number").default(1),
  status: varchar("status", { length: 20 }).default("Présent"),
  heureEntree: varchar("heure_entree", { length: 20 }),
  heureSortie: varchar("heure_sortie", { length: 20 }),
  remarques: text("remarques"),
}, (table) => ({
  employeeIdIdx: index("employee_attendance_emp_id_idx").on(table.employeeId),
  empDateIdx: index("employee_attendance_emp_date_idx").on(table.employeeId, table.date),
}));

export const payrollRules = pgTable("payroll_rules", {
  id: serial("id").primaryKey(),
  leaveAllowPerMonth: integer("leave_allow_per_month").default(1),
  latePenalty: doublePrecision("late_penalty").default(0.5),
  halfDayPenalty: doublePrecision("half_day_penalty").default(0.5),
});

export const salaryRecords = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  monthYear: varchar("month_year", { length: 20 }).notNull(), // e.g. "Juin 2025"
  // Attendance counts
  absentDays: integer("absent_days").default(0),
  leaveTaken: integer("leave_taken").default(0),
  lateDays: integer("late_days").default(0),
  halfDays: integer("half_days").default(0),
  // Salary calculation
  basicSalary: doublePrecision("basic_salary").default(0.0),
  calculatedBasic: doublePrecision("calculated_basic").default(0.0),
  totalAllowance: doublePrecision("total_allowance").default(0.0),
  totalDeduction: doublePrecision("total_deduction").default(0.0),
  netSalary: doublePrecision("net_salary").default(0.0),
  // Payment info
  status: varchar("status", { length: 20 }).default("Unpaid"), // Unpaid | Paid
  paymentDate: timestamp("payment_date"),
  paymentMode: varchar("payment_mode", { length: 50 }),
  remark: varchar("remark", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  employeeIdIdx: index("salary_records_emp_id_idx").on(table.employeeId),
  empMonthIdx: index("salary_records_emp_month_idx").on(table.employeeId, table.monthYear),
  empStatusIdx: index("salary_records_emp_status_idx").on(table.employeeId, table.status),
}));

export const teacherExtraHours = pgTable("teacher_extra_hours", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  typeHour: varchar("type_hour", { length: 50 }).notNull().default("Heure supplémentaire"), // Heure supplémentaire, Cours de soutien, Remplacement/Intérim, Surveillance examen
  className: varchar("class_name", { length: 50 }),
  subjectName: varchar("subject_name", { length: 100 }),
  hoursCount: doublePrecision("hours_count").default(1.0).notNull(),
  hourlyRate: doublePrecision("hourly_rate").default(2500.0).notNull(),
  totalAmount: doublePrecision("total_amount").default(2500.0).notNull(),
  status: varchar("status", { length: 30 }).default("En attente"), // En attente, Approuvé, Payé, Rejeté
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolEmpIdx: index("teacher_extra_hours_school_emp_idx").on(table.schoolId, table.employeeId),
  schoolStatusIdx: index("teacher_extra_hours_school_status_idx").on(table.schoolId, table.status),
}));

export const teacherHrRequests = pgTable("teacher_hr_requests", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // Congé maladie, Congé familial, Absence autorisée, Avance sur salaire, Attestation de travail, Autre
  startDate: varchar("start_date", { length: 20 }),
  endDate: varchar("end_date", { length: 20 }),
  daysCount: integer("days_count").default(1),
  advanceAmount: doublePrecision("advance_amount"),
  reason: text("reason").notNull(),
  documentUrl: text("document_url"),
  status: varchar("status", { length: 30 }).default("En attente"), // En attente, Approuvé, Rejeté
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolEmpIdx: index("teacher_hr_requests_school_emp_idx").on(table.schoolId, table.employeeId),
  schoolStatusIdx: index("teacher_hr_requests_school_status_idx").on(table.schoolId, table.status),
}));

// ── Relations ─────────────────────────────────────────────────
export const employeesRelations = relations(employees, ({ many }) => ({
  attendance: many(employeeAttendance),
  salaryRecords: many(salaryRecords),
  extraHours: many(teacherExtraHours),
  hrRequests: many(teacherHrRequests),
}));

export const employeeAttendanceRelations = relations(employeeAttendance, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeAttendance.employeeId],
    references: [employees.id],
  }),
}));

export const salaryRecordsRelations = relations(salaryRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [salaryRecords.employeeId],
    references: [employees.id],
  }),
}));

export const teacherExtraHoursRelations = relations(teacherExtraHours, ({ one }) => ({
  employee: one(employees, {
    fields: [teacherExtraHours.employeeId],
    references: [employees.id],
  }),
}));

export const teacherHrRequestsRelations = relations(teacherHrRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [teacherHrRequests.employeeId],
    references: [employees.id],
  }),
}));

