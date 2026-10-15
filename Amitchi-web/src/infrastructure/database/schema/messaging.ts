import { pgTable, serial, varchar, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";

export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  msgType: varchar("msg_type", { length: 20 }).notNull(), // SMS, Email
  content: text("content").notNull(),
  category: varchar("category", { length: 100 }).default("Général"), // Général, Finance, Absence, Événement
  createdAt: timestamp("created_at").defaultNow(),
});

export const messageLogs = pgTable("message_logs", {
  id: serial("id").primaryKey(),
  msgType: varchar("msg_type", { length: 20 }).notNull(),
  targetAudience: varchar("target_audience", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  recipientCount: integer("recipient_count").default(0),
  status: varchar("status", { length: 50 }).default("Envoyé"),
  sentBy: varchar("sent_by", { length: 100 }),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  msgType: varchar("msg_type", { length: 20 }).notNull(),
  targetAudience: varchar("target_audience", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: varchar("status", { length: 50 }).default("En attente"), // En attente, Envoyé, Annulé
  createdBy: varchar("created_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).default("info").notNull(), // 'info', 'warning', 'success', 'error'
  category: varchar("category", { length: 100 }).default("Général"), // 'Général', 'Finance', 'Scolarité', 'Absence', etc.
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }), // null pour broadcast à tous
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  isReadIdx: index("notifications_is_read_idx").on(table.isRead),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const teacherCommSettings = pgTable("teacher_comm_settings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id"),
  employeeId: integer("employee_id").notNull(),
  dndEnabled: boolean("dnd_enabled").default(true).notNull(),
  dndStartHour: varchar("dnd_start_hour", { length: 10 }).default("17:00").notNull(),
  dndEndHour: varchar("dnd_end_hour", { length: 10 }).default("07:30").notNull(),
  dndWeekends: boolean("dnd_weekends").default(true).notNull(),
  autoReplyMessage: text("auto_reply_message").default("Bonjour. Le professeur est actuellement hors de ses heures de disponibilité scolaire. Votre message sera traité lors de la prochaine journée de cours.").notNull(),
  cannedResponses: text("canned_responses"), // JSON array string
  updatedAt: timestamp("updated_at").defaultNow(),
});

