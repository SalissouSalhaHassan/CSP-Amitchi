import { z } from "zod";

export const classSchema = z.object({
  className: z.string().min(2, "Le nom de la classe est requis"),
  sectionId: z.number().nullish(),
});

export const subjectSchema = z.object({
  subjectName: z.string().min(2, "Le nom de la matière est requis"),
  subjectCode: z.string().nullish(),
  category: z.string().nullish(),
});

export const examSchema = z.object({
  examName: z.string().min(3, "Le nom de l'examen est requis"),
  examDate: z.string().nullish(),
});

export const periodSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  periodType: z.string().min(2, "Le type de période est requis"), // Trimestre / Semestre
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  sessionId: z.number().nullish(),
  isActive: z.boolean().default(true),
});

export type ClassFormData = z.infer<typeof classSchema>;
export type SubjectFormData = z.infer<typeof subjectSchema>;
export type ExamFormData = z.infer<typeof examSchema>;
export type PeriodFormData = z.infer<typeof periodSchema>;
