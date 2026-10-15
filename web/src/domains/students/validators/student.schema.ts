import { z } from "zod";

export const studentSchema = z.object({
  // Identité
  numAdmission: z.string().min(1, "Le numéro d'admission est requis"),
  nomEtudiant: z.string().min(3, "Le nom complet est requis"),
  nomArabe: z.string().nullish(),
  sexe: z.enum(["Garçon", "Fille"], { error: "Le sexe est requis" }),
  religion: z.string().nullish(),
  dateNaissance: z.string().nullish(),
  lieuNaissance: z.string().nullish(),
  cnic: z.string().nullish(),
  groupeSanguin: z.string().nullish(),
  
  // Informations académiques
  session: z.string().nullish(),
  educationalLevel: z.string().nullish(),
  classe: z.string().nullish(),
  section: z.string().nullish(),
  categorie: z.string().nullish(),
  
  // Famille & Contact
  nomPere: z.string().nullish(),
  cnicPere: z.string().nullish(),
  mobile: z.string().nullish(),
  whatsapp: z.string().nullish(),
  
  // Finances
  fraisMensuels: z.number().min(0).default(0),
  ancienSolde: z.number().min(0).default(0),
  fraisInscription: z.number().min(0).default(0),
  fraisCogesCard: z.number().min(0).default(0),
  fraisTransportInternat: z.number().min(0).default(0),
  
  // Statut & Sécurité Biométrique
  statut: z.string().default("Actif"),
  behaviorScore: z.number().min(0).max(20).default(0),
  photoPath: z.string().optional(),
  activationPin: z.string().nullish(),
  fingerprintHash: z.string().nullish(),
});

export type StudentFormData = z.infer<typeof studentSchema>;
