import { pgTable, serial, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { employees } from "./hr";
import { students } from "./students";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  roleName: varchar("role_name", { length: 50 }).notNull().unique(),
  description: varchar("description", { length: 200 }),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id),
  moduleName: varchar("module_name", { length: 50 }),
  canView: boolean("can_view").default(true),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  fieldPermissions: text("field_permissions"), // JSON string: { "field_name": { "view": true, "edit": false } }
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // for subdomains: school1.edut.pro
  customDomain: varchar("custom_domain", { length: 255 }).unique(), // for custom domains: portal.school.edu
  logoPath: text("logo_path"),
  plan: varchar("plan", { length: 50 }).default("basic"), // basic, pro, enterprise
  status: varchar("status", { length: 20 }).default("active"), // active, suspended, trialing
  subscriptionExpiry: timestamp("subscription_expiry"),
  licenseKey: varchar("license_key", { length: 255 }),
  billingCycle: varchar("billing_cycle", { length: 20 }).default("monthly"), // monthly, annual
  autoRenew: boolean("auto_renew").default(true),
  // Quotas & Usage Limits (قيود الاستهلاك لكل مدرسة لحماية خطة Supabase المجانية)
  maxStudents: integer("max_students").default(500), // الحد الأقصى للطلاب
  maxStorageMb: integer("max_storage_mb").default(100), // الحد الأقصى للملفات والتخزين بالميغابايت (ضمن 1GB Supabase)
  currentStorageMb: integer("current_storage_mb").default(0), // الاستهلاك الحالي بالميغابايت
  maxMonthlySyncOps: integer("max_monthly_sync_ops").default(5000), // حد عمليات المزامنة الشهرية
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // Link user to a school
  utilisateur: varchar("utilisateur", { length: 50 }).notNull().unique(),
  supabaseId: varchar("supabase_id", { length: 255 }).unique(),
  nomPrenom: varchar("nom_prenom", { length: 100 }),
  motDePasse: text("mot_de_passe").notNull(),
  admin: boolean("admin").default(false),
  superAdmin: boolean("super_admin").default(false), // Owner of the whole platform
  langue: varchar("langue", { length: 2 }).default("FR"),
  roleId: integer("role_id").references(() => roles.id),
  emplacement: varchar("emplacement", { length: 100 }),
  depots: text("depots"),
  educationalLevel: varchar("educational_level", { length: 50 }).default("Primaire"),
  avatarUrl: text("avatar_url"),
  // Liaison identité — pour Élève, Enseignant, Parent
  studentId: integer("student_id").references(() => students.id),
  employeeId: integer("employee_id").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  username: varchar("username", { length: 50 }),
  action: varchar("action", { length: 20 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

import { relations } from "drizzle-orm";

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [users.studentId],
    references: [students.id],
  }),
  employee: one(employees, {
    fields: [users.employeeId],
    references: [employees.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(users),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
}));

