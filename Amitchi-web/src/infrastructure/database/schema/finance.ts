import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schoolSessions } from "./academics";
import { schools } from "./auth";

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  amount: doublePrecision("amount").notNull(),
  dateExpense: timestamp("date_expense").notNull(),
  paymentMode: varchar("payment_mode", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Non Payé"),
  description: text("description"),
  attachmentPath: varchar("attachment_path", { length: 255 }),
  recordedBy: varchar("recorded_by", { length: 100 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("expenses_school_id_idx").on(table.schoolId),
  schoolDateIdx: index("expenses_school_date_idx").on(table.schoolId, table.dateExpense),
  schoolLevelIdx: index("expenses_school_level_idx").on(table.schoolId, table.educationalLevel),
}));

export const revenueCategories = pgTable("revenue_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  categoryId: integer("category_id").references(() => revenueCategories.id),
  title: varchar("title", { length: 200 }),
  amount: doublePrecision("amount").notNull(),
  dateReceived: timestamp("date_received").notNull(),
  paymentMode: varchar("payment_mode", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Reçu"),
  description: text("description"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("revenues_school_id_idx").on(table.schoolId),
  schoolDateIdx: index("revenues_school_date_idx").on(table.schoolId, table.dateReceived),
  schoolLevelIdx: index("revenues_school_level_idx").on(table.schoolId, table.educationalLevel),
}));

// POS specific tables for Sales
export const posSales = pgTable("pos_sales", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  totalAmount: doublePrecision("total_amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Completed"), // Can be "Synced", "Pending Sync"
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentFees = pgTable("student_fees", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id, { onDelete: "cascade" }),
  totalExpected: doublePrecision("total_expected").notNull(),
  totalPaid: doublePrecision("total_paid").default(0),
  totalReduction: doublePrecision("total_reduction").default(0),
  balance: doublePrecision("balance").notNull(),
  status: varchar("status", { length: 20 }).default("Impayé"), // Impayé, Partiel, Soldé
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("student_fees_school_id_idx").on(table.schoolId),
  schoolSessionIdx: index("student_fees_school_session_idx").on(table.schoolId, table.sessionId),
  studentIdIdx: index("student_fees_student_id_idx").on(table.studentId),
  statusIdx: index("student_fees_status_idx").on(table.schoolId, table.sessionId, table.status),
}));

export const feePayments = pgTable("fee_payments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  feeId: integer("fee_id").references(() => studentFees.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  reduction: doublePrecision("reduction").default(0),
  datePaid: timestamp("date_paid").defaultNow(),
  monthConcerned: varchar("month_concerned", { length: 50 }),
  paymentMode: varchar("payment_mode", { length: 50 }).default("Espèces"),
  reference: varchar("reference", { length: 100 }),
  receiptToken: varchar("receipt_token", { length: 100 }).unique(),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  schoolIdIdx: index("fee_payments_school_id_idx").on(table.schoolId),
  feeIdIdx: index("fee_payments_fee_id_idx").on(table.feeId),
  receiptTokenIdx: index("fee_payments_receipt_token_idx").on(table.receiptToken),
  schoolDatePaidIdx: index("fee_payments_school_date_idx").on(table.schoolId, table.datePaid),
  schoolUpdatedIdx: index("fee_payments_school_updated_idx").on(table.schoolId, table.updatedAt),
}));

export const feeTransactions = feePayments;
export const feeStructures = studentFees;

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const revenuesRelations = relations(revenues, ({ one }) => ({
  category: one(revenueCategories, {
    fields: [revenues.categoryId],
    references: [revenueCategories.id],
  }),
}));

export const revenueCategoriesRelations = relations(revenueCategories, ({ many }) => ({
  revenues: many(revenues),
}));

export const studentFeesRelations = relations(studentFees, ({ one, many }) => ({
  student: one(students, {
    fields: [studentFees.studentId],
    references: [students.id],
  }),
  session: one(schoolSessions, {
    fields: [studentFees.sessionId],
    references: [schoolSessions.id],
  }),
  payments: many(feePayments),
}));

export const feePaymentsRelations = relations(feePayments, ({ one }) => ({
  fee: one(studentFees, {
    fields: [feePayments.feeId],
    references: [studentFees.id],
  }),
}));

export const cogesPayments = pgTable("coges_payments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  studentId: integer("student_id"),
  classe: varchar("classe", { length: 100 }),
  session: varchar("session", { length: 50 }),
  amount: doublePrecision("amount").notNull(),
  amountLetters: varchar("amount_letters", { length: 255 }),
  receivedFrom: varchar("received_from", { length: 255 }).notNull(),
  purpose: varchar("purpose", { length: 255 }),
  datePaid: timestamp("date_paid").defaultNow(),
  status: varchar("status", { length: 20 }).default("Validé"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Phase 3: Mobile Money & SYSCOHADA Accounting Tables ---

export const onlineTransactions = pgTable("online_transactions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
  feeId: integer("fee_id").references(() => studentFees.id, { onDelete: "set null" }),
  transactionReference: varchar("transaction_reference", { length: 100 }).notNull().unique(),
  provider: varchar("provider", { length: 50 }).notNull(), // ORANGE_MONEY, MOOV_MONEY, WAVE, BANK_CARD, CINETPAY
  providerTransactionId: varchar("provider_transaction_id", { length: 100 }),
  amount: doublePrecision("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("XOF"),
  phoneNumber: varchar("phone_number", { length: 30 }),
  status: varchar("status", { length: 20 }).default("PENDING"), // PENDING, SUCCESS, FAILED, EXPIRED, REFUNDED
  purpose: varchar("purpose", { length: 255 }), // Scolarité, Inscription, COGES
  webhookPayload: jsonb("webhook_payload"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("online_txn_school_idx").on(table.schoolId),
  txnRefIdx: index("online_txn_ref_idx").on(table.transactionReference),
}));

export const syscohadaAccounts = pgTable("syscohada_accounts", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  accountNumber: varchar("account_number", { length: 20 }).notNull(), // e.g. 512000, 531000, 706000
  accountName: varchar("account_name", { length: 150 }).notNull(),
  categoryClass: integer("category_class").notNull(), // 1 to 7 (SYSCOHADA Classes)
  accountType: varchar("account_type", { length: 20 }).default("ACTIF"), // ACTIF, PASSIF, CHARGE, PRODUIT
  createdAt: timestamp("created_at").defaultNow(),
});

export const syscohadaEntries = pgTable("syscohada_entries", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  sessionId: integer("session_id").references(() => schoolSessions.id),
  entryDate: timestamp("entry_date").defaultNow(),
  reference: varchar("reference", { length: 50 }).notNull(),
  accountId: integer("account_id").references(() => syscohadaAccounts.id),
  label: varchar("label", { length: 255 }).notNull(),
  debit: doublePrecision("debit").default(0),
  credit: doublePrecision("credit").default(0),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cogesBudgets = pgTable("coges_budgets", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  sessionId: integer("session_id").references(() => schoolSessions.id),
  category: varchar("category", { length: 100 }).notNull(), // Santé, Équipement, Entretien, Sport, Animation
  budgetedAmount: doublePrecision("budgeted_amount").notNull(),
  realizedAmount: doublePrecision("realized_amount").default(0),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Catalogue des Bourses & Exonérations
 */
export const scholarships = pgTable("scholarships", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 150 }).notNull(), // e.g. "Bourse d'État UEMOA", "Excellence Académique"
  provider: varchar("provider", { length: 150 }).default("Ministère de l'Enseignement Supérieur"),
  type: varchar("type", { length: 50 }).default("Pourcentage"), // Pourcentage | Montant Fixe
  discountValue: doublePrecision("discount_value").notNull().default(50.0), // 50% or fixed amount
  appliesTo: varchar("applies_to", { length: 50 }).default("Frais de Scolarité"), // Frais de Scolarité | Totalité des Frais | Inscription
  academicYear: varchar("academic_year", { length: 50 }),
  criteria: text("criteria"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Attribution des Bourses aux Étudiants
 */
export const studentScholarships = pgTable("student_scholarships", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  scholarshipId: integer("scholarship_id").references(() => scholarships.id, { onDelete: "cascade" }),
  academicYear: varchar("academic_year", { length: 50 }),
  customDiscountPercentage: doublePrecision("custom_discount_percentage"),
  allocatedAmount: doublePrecision("allocated_amount").default(0),
  decisionReference: varchar("decision_reference", { length: 100 }),
  decisionDate: timestamp("decision_date").defaultNow(),
  status: varchar("status", { length: 50 }).default("Actif"), // Actif | Suspendu | Expiré
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Échéanciers & Mensualités de Paiement des Frais
 */
export const studentPaymentSchedules = pgTable("student_payment_schedules", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id),
  installmentNumber: integer("installment_number").notNull().default(1),
  label: varchar("label", { length: 100 }).notNull(), // e.g. "Mensualité Octobre 2025"
  dueDate: timestamp("due_date").notNull(),
  grossAmount: doublePrecision("gross_amount").notNull(), // Montant brut
  scholarshipDeduction: doublePrecision("scholarship_deduction").default(0), // Déduction bourse
  netAmount: doublePrecision("net_amount").notNull(), // Net à payer
  paidAmount: doublePrecision("paid_amount").default(0),
  balance: doublePrecision("balance").notNull(),
  status: varchar("status", { length: 50 }).default("À échoir"), // Payé | Partiel | À échoir | En retard | Relancé
  reminderSentAt: timestamp("reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


