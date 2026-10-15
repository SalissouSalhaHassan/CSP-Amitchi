import { z } from "zod";

export const homeworkSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  description: z.string().nullish(),
  classId: z.number(),
  subjectId: z.number(),
  dateDue: z.string(),
  attachmentPath: z.string().nullish(),
});

export type HomeworkFormData = z.infer<typeof homeworkSchema>;
