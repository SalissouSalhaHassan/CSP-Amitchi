import { pgTable, serial, varchar, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { users, schools } from "./auth";

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // INSERT, UPDATE, DELETE, LOGIN, etc.
  tableName: varchar("table_name", { length: 50 }),
  recordId: varchar("record_id", { length: 50 }),
  oldData: text("old_data"), // JSON string of record before change
  newData: text("new_data"), // JSON string of record after change
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

import { relations } from "drizzle-orm";

export const idempotencyLogs = pgTable("idempotency_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  idempotencyKey: varchar("idempotency_key", { length: 150 }).notNull().unique(),
  endpoint: varchar("endpoint", { length: 100 }),
  responseStatus: integer("response_status").default(200),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const syncConflicts = pgTable("sync_conflicts", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: varchar("record_id", { length: 50 }).notNull(),
  fieldName: varchar("field_name", { length: 50 }),
  serverValue: jsonb("server_value"),
  clientValue: jsonb("client_value"),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending' | 'resolved_server' | 'resolved_client'
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [auditLogs.schoolId],
    references: [schools.id],
  }),
}));
