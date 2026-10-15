import { z } from "zod";

export const inventoryCategorySchema = z.object({
  name: z.string().min(2, "Le nom de la catégorie est requis"),
  description: z.string().nullish(),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(2, "Le nom de l'article est requis"),
  sku: z.string().nullish(),
  categoryId: z.number().nullish(),
  quantity: z.number().min(0).default(1),
  unitPrice: z.number().min(0).default(0),
  condition: z.string().default("Neuf"),
  location: z.string().nullish(),
});

export const inventoryAssignmentSchema = z.object({
  itemId: z.number(),
  employeeId: z.number(),
  assignedQty: z.number().min(1).default(1),
  notes: z.string().nullish(),
});

export type InventoryCategoryFormData = z.infer<typeof inventoryCategorySchema>;
export type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;
export type InventoryAssignmentFormData = z.infer<typeof inventoryAssignmentSchema>;
