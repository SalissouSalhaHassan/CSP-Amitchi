import { z } from "zod";

export const transportRouteSchema = z.object({
  routeName: z.string().min(2, "Le nom du trajet est requis"),
  vehicleNumber: z.string().min(1, "L'immatriculation est requise"),
  driverName: z.string().min(2, "Le nom du chauffeur est requis"),
  driverPhone: z.string().nullish(),
  monthlyFee: z.number().min(0).default(0),
});

export const transportSubscriptionSchema = z.object({
  studentId: z.number(),
  routeId: z.number(),
  pickupPoint: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  status: z.string().default("Actif"),
});

export type TransportRouteFormData = z.infer<typeof transportRouteSchema>;
export type TransportSubscriptionFormData = z.infer<typeof transportSubscriptionSchema>;
