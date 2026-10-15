import { z } from "zod";

export const paymentSchema = z.object({
  feeId: z.number(),
  amount: z.number().min(0, "Le montant doit être positif"),
  reduction: z.number().min(0).default(0),
  paymentMode: z.string().default("Espèces"),
  monthConcerned: z.string().nullish(),
  reference: z.string().nullish(),
  notes: z.string().nullish(),
  datePaid: z.string().nullish(),
});

export const expenseSchema = z.object({
  categoryId: z.number(),
  amount: z.number().positive("Le montant doit être positif"),
  dateExpense: z.string(),
  paymentMode: z.string(),
  description: z.string().nullish(),
  reference: z.string(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
