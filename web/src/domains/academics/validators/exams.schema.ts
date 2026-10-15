import { z } from "zod";

export const examSchema = z.object({
  examName: z.string().min(2, "Le nom de l'examen est requis"),
  classId: z.number(),
  subjectId: z.number(),
  periodId: z.number().nullish(),
  examDate: z.string().nullish(),
  maxMarks: z.number().default(20),
});

export const examResultSchema = z.object({
  examId: z.number(),
  studentId: z.number(),
  marksObtained: z.number().min(0),
  remarks: z.string().nullish(),
});

export const batchExamResultSchema = z.object({
  examId: z.number(),
  results: z.array(z.object({
    studentId: z.number(),
    marksObtained: z.number().min(0),
    remarks: z.string().nullish(),
    originalMarksObtained: z.number().min(0).nullish(),
    originalRemarks: z.string().nullish(),
  })),
});

export type ExamFormData = z.infer<typeof examSchema>;
export type ExamResultFormData = z.infer<typeof examResultSchema>;
export type BatchExamResultFormData = z.infer<typeof batchExamResultSchema>;
