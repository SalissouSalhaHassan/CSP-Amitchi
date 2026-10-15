import { z } from "zod";

export const employeeSchema = z.object({
  empId: z.string().min(1, "Le numéro d'employé est requis"),
  nom: z.string().min(3, "Le nom complet est requis"),
  poste: z.string().nullish(),
  departement: z.string().nullish(),
  mobile: z.string().nullish(),
  email: z.string().email("L'adresse e-mail est invalide").nullish().or(z.literal("")),
  dateEmbauche: z.string().nullish(),
  salaireBase: z.number().min(0).default(0),
  sexe: z.enum(["Homme", "Femme"], { error: "Le sexe est requis" }).nullish(),
  dateNaissance: z.string().nullish(),
  cnic: z.string().nullish(),
  adresse: z.string().nullish(),
  banqueNom: z.string().nullish(),
  banqueCompte: z.string().nullish(),
  statut: z.string().default("Actif"),
  educationalLevel: z.string().nullish(),
  lieuNaissance: z.string().nullish(),
  codeGrade: z.string().nullish(),
  categorie: z.string().nullish(),
  classe: z.string().nullish(),
  echelon: z.string().nullish(),
  fonction: z.string().nullish(),
  dateNomination: z.string().nullish(),
  lieuAffectation: z.string().nullish(),
  commune: z.string().nullish(),
  region: z.string().nullish(),
  dateAffectation: z.string().nullish(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

