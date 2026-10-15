import { pgTable, serial, varchar, integer, timestamp, decimal, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { employees } from "./hr";

export const libraryBooks = pgTable("library_books", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id"),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  isbn: varchar("isbn", { length: 100 }),
  category: varchar("category", { length: 100 }),
  totalQuantity: integer("total_quantity").notNull().default(1),
  availableQuantity: integer("available_quantity").notNull().default(1),
  shelfLocation: varchar("shelf_location", { length: 100 }),
  fileUrl: varchar("file_url", { length: 500 }),
  fileType: varchar("file_type", { length: 50 }).default("PDF"), // PDF, EPUB, LINK, AUDIO, VIDEO
  isDigital: text("is_digital").default("false"), // "true" | "false"
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const libraryIssues = pgTable("library_issues", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id"),
  bookId: integer("book_id").references(() => libraryBooks.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  issueDate: timestamp("issue_date").defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  returnDate: timestamp("return_date"),
  status: varchar("status", { length: 50 }).notNull().default("En cours"), // En cours, En retard, Retourné
  fineAmount: decimal("fine_amount", { precision: 15, scale: 2 }).default("0"),
});

export const libraryBooksRelations = relations(libraryBooks, ({ many }) => ({
  issues: many(libraryIssues),
}));

export const libraryIssuesRelations = relations(libraryIssues, ({ one }) => ({
  book: one(libraryBooks, {
    fields: [libraryIssues.bookId],
    references: [libraryBooks.id],
  }),
  student: one(students, {
    fields: [libraryIssues.studentId],
    references: [students.id],
  }),
  employee: one(employees, {
    fields: [libraryIssues.employeeId],
    references: [employees.id],
  }),
}));
