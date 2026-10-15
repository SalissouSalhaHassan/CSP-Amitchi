import { z } from "zod";

export const libraryBookSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  author: z.string().nullish(),
  isbn: z.string().nullish(),
  category: z.string().nullish(),
  totalQuantity: z.number().min(1).default(1),
  shelfLocation: z.string().nullish(),
  fileUrl: z.string().nullish(),
  fileType: z.string().nullish(),
  isDigital: z.string().nullish(),
  description: z.string().nullish(),
});

export const libraryIssueSchema = z.object({
  bookId: z.number(),
  studentId: z.number().nullish(),
  employeeId: z.number().nullish(),
  dueDate: z.string(),
});

export type LibraryBookFormData = z.infer<typeof libraryBookSchema>;
export type LibraryIssueFormData = z.infer<typeof libraryIssueSchema>;
