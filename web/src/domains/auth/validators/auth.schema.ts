import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit comporter au moins 3 caractères"),
  password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
