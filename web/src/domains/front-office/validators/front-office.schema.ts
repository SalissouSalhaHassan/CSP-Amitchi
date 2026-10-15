import { z } from "zod";

export const visitorSchema = z.object({
  visitorName: z.string().min(2, "Le nom est requis"),
  phone: z.string().nullish(),
  purpose: z.string().min(2, "Le motif est requis"),
  meetingWith: z.string().nullish(),
  timeIn: z.string(),
  timeOut: z.string().nullish(),
  note: z.string().nullish(),
});

export const enquirySchema = z.object({
  parentName: z.string().min(2, "Le nom du parent est requis"),
  phone: z.string().min(2, "Le téléphone est requis"),
  childName: z.string().nullish(),
  classRequested: z.string().nullish(),
  source: z.string().nullish(),
  followUpDate: z.string().nullish(),
  status: z.string().default("En Attente"),
});

export const postalSchema = z.object({
  recordType: z.string(),
  referenceNo: z.string().nullish(),
  senderReceiver: z.string().min(2, "Le nom est requis"),
  address: z.string().nullish(),
});

export type VisitorFormData = z.infer<typeof visitorSchema>;
export type EnquiryFormData = z.infer<typeof enquirySchema>;
export type PostalFormData = z.infer<typeof postalSchema>;
