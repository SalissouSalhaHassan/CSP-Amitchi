import { z } from "zod";

export const incidentSchema = z.object({
  studentId: z.number(),
  incidentType: z.string().min(2, "Le type d'incident est requis"),
  severity: z.string().default("Mineur"),
  description: z.string().nullish().transform(v => v === "" ? null : v),
  proposedAction: z.string().nullish().transform(v => v === "" ? null : v),
  status: z.string().default("En attente"),
});

export type IncidentFormData = z.infer<typeof incidentSchema>;
