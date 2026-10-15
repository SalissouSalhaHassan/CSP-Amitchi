import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schools } from "./auth";

export const canteenItems = pgTable("canteen_items", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 50 }),
  price: doublePrecision("price").notNull(),
  category: varchar("category", { length: 50 }).default("Plat"), // Plat, Snack, Boisson, Dessert, Entrée
  stock: integer("stock").default(100),
  calories: integer("calories"),
  allergens: text("allergens"), // e.g. "Arachides, Lactose, Gluten, Oeufs"
  isVegetarian: boolean("is_vegetarian").default(false),
  isHalal: boolean("is_halal").default(true),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("canteen_items_school_id_idx").on(table.schoolId),
}));

export const canteenWeeklyMenu = pgTable("canteen_weekly_menu", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  weekStartDate: varchar("week_start_date", { length: 20 }).notNull(), // 'YYYY-MM-DD'
  dayOfWeek: varchar("day_of_week", { length: 20 }).notNull(), // 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
  mealType: varchar("meal_type", { length: 50 }).default("Déjeuner"), // 'Déjeuner', 'Goûter', 'Dîner'
  starterDish: varchar("starter_dish", { length: 150 }), // e.g. "Salade de concombre & tomates"
  mainDish: varchar("main_dish", { length: 150 }).notNull(), // e.g. "Riz gras au poisson rouge"
  sideDish: varchar("side_dish", { length: 150 }), // e.g. "Légumes sautés & alloco"
  dessert: varchar("dessert", { length: 150 }), // e.g. "Mangue fraîche ou Yaourt"
  allergens: text("allergens"), // e.g. "Poisson, Lactose"
  calories: integer("calories").default(650),
  isVegetarian: boolean("is_vegetarian").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("canteen_weekly_menu_school_id_idx").on(table.schoolId),
  weekIdx: index("canteen_weekly_menu_week_idx").on(table.weekStartDate),
}));

export const canteenMealSubscriptions = pgTable("canteen_meal_subscriptions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  planType: varchar("plan_type", { length: 100 }).default("Demi-pension (Déjeuner)"), // 'Demi-pension (Déjeuner)', 'Complet (Déjeuner + Goûter)', 'Pension Complète (Internat)'
  monthlyPrice: doublePrecision("monthly_price").default(25000), // CFA
  specialDiet: varchar("special_diet", { length: 100 }).default("Normal"), // 'Normal', 'Sans arachides', 'Sans lactose', 'Végétarien', 'Sans gluten'
  allergiesNotice: text("allergies_notice"),
  parentPhone: varchar("parent_phone", { length: 50 }),
  parentWhatsapp: varchar("parent_whatsapp", { length: 50 }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("Actif"), // 'Actif', 'Suspendu', 'Expiré'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("canteen_meal_subscriptions_school_id_idx").on(table.schoolId),
  studentIdIdx: index("canteen_meal_subscriptions_student_id_idx").on(table.studentId),
}));

export const studentWallets = pgTable("student_wallets", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull().unique(),
  balance: doublePrecision("balance").default(0).notNull(),
  dailySpendingLimit: doublePrecision("daily_spending_limit").default(2000), // CFA per day max
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("student_wallets_school_id_idx").on(table.schoolId),
  studentIdIdx: index("student_wallets_student_id_idx").on(table.studentId),
}));

export const canteenMealConsumptions = pgTable("canteen_meal_consumptions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: integer("subscription_id").references(() => canteenMealSubscriptions.id, { onDelete: "set null" }),
  mealType: varchar("meal_type", { length: 50 }).default("Déjeuner"),
  consumptionDate: varchar("consumption_date", { length: 20 }).notNull(), // 'YYYY-MM-DD'
  servedAt: timestamp("served_at").defaultNow().notNull(),
  menuDescription: text("menu_description"),
  servedBy: varchar("served_by", { length: 100 }).default("Chef de Cantine"),
  allergyWarningTriggered: boolean("allergy_warning_triggered").default(false),
  costDeducted: doublePrecision("cost_deducted").default(0),
  parentNotified: boolean("parent_notified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("canteen_meal_consumptions_school_id_idx").on(table.schoolId),
  studentIdIdx: index("canteen_meal_consumptions_student_id_idx").on(table.studentId),
  dateIdx: index("canteen_meal_consumptions_date_idx").on(table.consumptionDate),
}));

export const canteenInvoices = pgTable("canteen_invoices", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  clientName: varchar("client_name", { length: 150 }).default("CLIENT COMPTANT"),
  studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
  subtotal: doublePrecision("subtotal").notNull(),
  tva: doublePrecision("tva").default(0),
  totalTtc: doublePrecision("total_ttc").notNull(),
  amountReceived: doublePrecision("amount_received").default(0),
  changeGiven: doublePrecision("change_given").default(0),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash"), // Cash, Carte, Mobile Money, Solde Compte, etc.
  status: varchar("status", { length: 50 }).default("Payée"), // Payée, En attente, Annulée
  itemsJson: text("items_json"),
  cashierName: varchar("cashier_name", { length: 100 }).default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("canteen_invoices_school_id_idx").on(table.schoolId),
  studentIdIdx: index("canteen_invoices_student_id_idx").on(table.studentId),
}));

export const canteenTransactions = pgTable("canteen_transactions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  amount: doublePrecision("amount").notNull(), // positive for top-up, negative for purchase
  type: varchar("type", { length: 50 }).default("Recharge"), // 'Recharge', 'Achat Repas', 'Ajustement'
  paymentMethod: varchar("payment_method", { length: 50 }).default("Espèces"), // Espèces, Flooz, Airtel Money, Virement
  itemsDesc: text("items_desc"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  recordedBy: varchar("recorded_by", { length: 100 }),
}, (table) => ({
  schoolIdIdx: index("canteen_transactions_school_id_idx").on(table.schoolId),
  studentIdIdx: index("canteen_transactions_student_id_idx").on(table.studentId),
}));

// ─── Relations ───────────────────────────────────────────────────────────────

export const canteenWeeklyMenuRelations = relations(canteenWeeklyMenu, ({ one }) => ({
  school: one(schools, {
    fields: [canteenWeeklyMenu.schoolId],
    references: [schools.id],
  }),
}));

export const canteenMealSubscriptionsRelations = relations(canteenMealSubscriptions, ({ one, many }) => ({
  student: one(students, {
    fields: [canteenMealSubscriptions.studentId],
    references: [students.id],
  }),
  consumptions: many(canteenMealConsumptions),
}));

export const studentWalletsRelations = relations(studentWallets, ({ one }) => ({
  student: one(students, {
    fields: [studentWallets.studentId],
    references: [students.id],
  }),
}));

export const canteenMealConsumptionsRelations = relations(canteenMealConsumptions, ({ one }) => ({
  student: one(students, {
    fields: [canteenMealConsumptions.studentId],
    references: [students.id],
  }),
  subscription: one(canteenMealSubscriptions, {
    fields: [canteenMealConsumptions.subscriptionId],
    references: [canteenMealSubscriptions.id],
  }),
}));

export const canteenTransactionsRelations = relations(canteenTransactions, ({ one }) => ({
  student: one(students, {
    fields: [canteenTransactions.studentId],
    references: [students.id],
  }),
}));
