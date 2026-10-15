import { pgTable, serial, varchar, text, timestamp, boolean, doublePrecision, integer, index, unique } from "drizzle-orm/pg-core";
import { schools } from "./auth";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // SaaS isolation
  numAdmission: varchar("num_admission", { length: 50 }).notNull(),
  nomEtudiant: varchar("nom_etudiant", { length: 100 }).notNull(),
  nomArabe: varchar("nom_arabe", { length: 100 }),
  sexe: varchar("sexe", { length: 50 }),
  religion: varchar("religion", { length: 50 }),
  dateNaissance: varchar("date_naissance", { length: 100 }),
  lieuNaissance: varchar("lieu_naissance", { length: 100 }),
  cnic: varchar("cnic", { length: 255 }),
  groupeSanguin: varchar("groupe_sanguin", { length: 10 }),
  
  session: varchar("session", { length: 50 }),
  educationalLevel: varchar("educational_level", { length: 100 }),
  classe: varchar("classe", { length: 100 }),
  classId: integer("class_id"),   // Direct link to school_classes.id (preferred lookup)
  section: varchar("section", { length: 100 }),
  categorie: varchar("categorie", { length: 50 }),
  
  nomPere: varchar("nom_pere", { length: 100 }),
  cnicPere: varchar("cnic_pere", { length: 255 }),
  mobile: varchar("mobile", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 255 }),
  fatherQualification: varchar("father_qualification", { length: 200 }),
  phoneFixe: varchar("phone_fixe", { length: 100 }),
  hasSiblings: varchar("has_siblings", { length: 50 }),
  
  fraisMensuels: doublePrecision("frais_mensuels").default(0.0),
  ancienSolde: doublePrecision("ancien_solde").default(0.0),
  fraisInscription: doublePrecision("frais_inscription").default(0.0),
  fraisTransport: doublePrecision("frais_transport").default(0.0),
  fraisCantine: doublePrecision("frais_cantine").default(0.0),
  fraisAssurance: doublePrecision("frais_assurance").default(0.0),
  bourse: doublePrecision("bourse").default(0.0),
  fraisCogesCard: doublePrecision("frais_coges_card").default(0.0),
  fraisTransportInternat: doublePrecision("frais_transport_internat").default(0.0),
  frequencePaiement: varchar("frequence_paiement", { length: 100 }),
  
  statut: varchar("statut", { length: 20 }).default("Actif"),
  behaviorScore: doublePrecision("behavior_score").default(0.0),
  photoPath: text("photo_path"),
  activationPin: varchar("activation_pin", { length: 50 }),
  redoublementCount: integer("redoublement_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("students_school_id_idx").on(table.schoolId),
  schoolLevelIdx: index("students_school_level_idx").on(table.schoolId, table.educationalLevel),
  schoolClassIdx: index("students_school_class_idx").on(table.schoolId, table.classe),
  schoolStatusIdx: index("students_school_status_idx").on(table.schoolId, table.statut),
  schoolCreatedIdx: index("students_school_created_idx").on(table.schoolId, table.createdAt),
  schoolUpdatedIdx: index("students_school_updated_idx").on(table.schoolId, table.updatedAt),
  unqNumAdmission: unique().on(table.schoolId, table.numAdmission),
}));
