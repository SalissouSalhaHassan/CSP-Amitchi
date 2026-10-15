import { pgTable, serial, varchar, text, timestamp, integer, boolean, date, time, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";
import { employees } from "./hr";
import { students } from "./students";
import { schoolClasses, schoolSubjects } from "./academics";

// ─── Cahier de textes (lesson logbook) ────────────────────────────────────────
export const cahierTextes = pgTable("cahier_textes", {
  id:            serial("id").primaryKey(),
  schoolId:      integer("school_id").references(() => schools.id),
  classId:       integer("class_id").references(() => schoolClasses.id),
  subjectId:     integer("subject_id").references(() => schoolSubjects.id),
  employeeId:    integer("employee_id").references(() => employees.id),
  sessionDate:   date("session_date").notNull(),
  heureDebut:    time("heure_debut"),
  heureFin:      time("heure_fin"),
  titreLecon:    varchar("titre_lecon", { length: 255 }).notNull(),
  objectifs:     text("objectifs"),
  contenuRealise: text("contenu_realise"),
  supportsUtilises: text("supports_utilises"),
  devoirDonne:   text("devoir_donne"),
  observation:   text("observation"),
  // Validation workflow
  statut:        varchar("statut", { length: 30 }).default("En attente"), // En attente | Validé | Rejeté
  valideParId:   integer("valide_par_id").references(() => employees.id),
  valideAt:      timestamp("valide_at"),
  anneeScolaire: varchar("annee_scolaire", { length: 20 }),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

// ─── Relations ─────────────────────────────────────────────────────────────────
export const cahierTextesRelations = relations(cahierTextes, ({ one }) => ({
  school:    one(schools,        { fields: [cahierTextes.schoolId],    references: [schools.id] }),
  class:     one(schoolClasses,  { fields: [cahierTextes.classId],     references: [schoolClasses.id] }),
  subject:   one(schoolSubjects, { fields: [cahierTextes.subjectId],   references: [schoolSubjects.id] }),
  employee:  one(employees,      { fields: [cahierTextes.employeeId],  references: [employees.id], relationName: "seance_employee" }),
  validePar: one(employees,      { fields: [cahierTextes.valideParId], references: [employees.id], relationName: "seance_validateur" }),
}));

// ─── Planification pédagogique ────────────────────────────────────────
export const pedagogiePlanification = pgTable("pedagogie_planifications", {
  id:              serial("id").primaryKey(),
  schoolId:        integer("school_id").references(() => schools.id),
  classId:         integer("class_id").references(() => schoolClasses.id),
  subjectId:       integer("subject_id").references(() => schoolSubjects.id),
  employeeId:      integer("employee_id").references(() => employees.id),
  typePlan:        varchar("type_plan", { length: 50 }).notNull(), // Annuel | Mensuel | Hebdomadaire | Officiel
  periode:         varchar("periode", { length: 100 }), // Trimestre 1, Octobre, Semaine 42, etc.
  chapitre:        varchar("chapitre", { length: 255 }).notNull(),
  leconPrevue:     varchar("lecon_prevue", { length: 255 }).notNull(),
  competenceVisee: text("competence_visee"),
  datePrevue:      date("date_prevue"),
  statut:          varchar("statut", { length: 30 }).default("Planifié"), // Planifié | En cours | Réalisé | En retard | Reporté
  observation:     text("observation"),
  anneeScolaire:   varchar("annee_scolaire", { length: 20 }),
  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});

export const pedagogiePlanificationRelations = relations(pedagogiePlanification, ({ one }) => ({
  school:   one(schools,        { fields: [pedagogiePlanification.schoolId],   references: [schools.id] }),
  class:    one(schoolClasses,  { fields: [pedagogiePlanification.classId],    references: [schoolClasses.id] }),
  subject:  one(schoolSubjects, { fields: [pedagogiePlanification.subjectId],  references: [schoolSubjects.id] }),
  employee: one(employees,      { fields: [pedagogiePlanification.employeeId], references: [employees.id] }),
}));

// ─── Ressources pédagogiques ─────────────────────────────────────────
export const pedagogieRessources = pgTable("pedagogie_ressources", {
  id:          serial("id").primaryKey(),
  schoolId:    integer("school_id").references(() => schools.id),
  title:       varchar("title", { length: 255 }).notNull(),
  type:        varchar("type", { length: 50 }).notNull(), // PDF | Vidéo | Audio | Présentation | Exercice | Corrigé | Lien externe | Image
  classId:     integer("class_id").references(() => schoolClasses.id),
  subjectId:   integer("subject_id").references(() => schoolSubjects.id),
  chapitre:    varchar("chapitre", { length: 255 }),
  lecon:       varchar("lecon", { length: 255 }),
  fileUrl:     varchar("file_url", { length: 255 }),
  externalUrl: varchar("external_url", { length: 255 }),
  employeeId:  integer("employee_id").references(() => employees.id),
  statut:      varchar("statut", { length: 30 }).default("Publié"), // Publié | Brouillon | Archivé
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

export const pedagogieRessourcesRelations = relations(pedagogieRessources, ({ one }) => ({
  school:   one(schools,        { fields: [pedagogieRessources.schoolId],   references: [schools.id] }),
  class:    one(schoolClasses,  { fields: [pedagogieRessources.classId],    references: [schoolClasses.id] }),
  subject:  one(schoolSubjects, { fields: [pedagogieRessources.subjectId],  references: [schoolSubjects.id] }),
  employee: one(employees,      { fields: [pedagogieRessources.employeeId], references: [employees.id] }),
}));

// ─── Réhabilitation et Remédiation ───────────────────────────────────
export const pedagogieRemediation = pgTable("pedagogie_remediations", {
  id:                serial("id").primaryKey(),
  schoolId:          integer("school_id").references(() => schools.id),
  studentId:         integer("student_id").references(() => students.id),
  classId:           integer("class_id").references(() => schoolClasses.id),
  subjectId:         integer("subject_id").references(() => schoolSubjects.id),
  employeeId:        integer("employee_id").references(() => employees.id),
  difficulties:      text("difficulties").notNull(),
  currentGrade:      doublePrecision("current_grade"),
  targetGrade:       doublePrecision("target_grade"),
  remediationPlan:   text("remediation_plan").notNull(),
  sessionsPlanned:   integer("sessions_planned").default(4),
  sessionsCompleted: integer("sessions_completed").default(0),
  status:            varchar("status", { length: 30 }).default("Actif"), // Actif | Clôturé
  alertLevel:        varchar("alert_level", { length: 20 }).default("Moyen"), // Critique | Moyen | Faible
  createdAt:         timestamp("created_at").defaultNow(),
  updatedAt:         timestamp("updated_at").defaultNow(),
});

export const pedagogieRemediationRelations = relations(pedagogieRemediation, ({ one }) => ({
  school:   one(schools,        { fields: [pedagogieRemediation.schoolId],   references: [schools.id] }),
  student:  one(students,       { fields: [pedagogieRemediation.studentId],  references: [students.id] }),
  class:    one(schoolClasses,  { fields: [pedagogieRemediation.classId],    references: [schoolClasses.id] }),
  subject:  one(schoolSubjects, { fields: [pedagogieRemediation.subjectId],  references: [schoolSubjects.id] }),
  employee: one(employees,      { fields: [pedagogieRemediation.employeeId], references: [employees.id] }),
}));

// ─── Inspection pédagogique ───────────────────────────────────────────
export const pedagogieInspection = pgTable("pedagogie_inspections", {
  id:              serial("id").primaryKey(),
  schoolId:        integer("school_id").references(() => schools.id),
  visitDate:       date("visit_date").notNull(),
  employeeId:      integer("employee_id").references(() => employees.id), // Enseignant inspecté
  classId:         integer("class_id").references(() => schoolClasses.id),
  subjectId:       integer("subject_id").references(() => schoolSubjects.id),
  leconObservee:   varchar("lecon_observee", { length: 255 }).notNull(),
  ponctualite:     varchar("ponctualite", { length: 50 }).default("Satisfaisant"), // Excellent | Satisfaisant | A améliorer
  methodologie:    varchar("methodologie", { length: 50 }).default("Satisfaisant"), // Excellent | Satisfaisant | A améliorer
  gestionClasse:   varchar("gestion_classe", { length: 50 }).default("Satisfaisant"), // Excellent | Satisfaisant | A améliorer
  supportsUtilises: text("supports_utilises"),
  noteInspection:  doublePrecision("note_inspection"),
  recommandations: text("recommandations"),
  status:          varchar("status", { length: 30 }).default("Ouvert"), // Ouvert | En attente | Clôturé
  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});

export const pedagogieInspectionRelations = relations(pedagogieInspection, ({ one }) => ({
  school:   one(schools,        { fields: [pedagogieInspection.schoolId],   references: [schools.id] }),
  class:    one(schoolClasses,  { fields: [pedagogieInspection.classId],    references: [schoolClasses.id] }),
  subject:  one(schoolSubjects, { fields: [pedagogieInspection.subjectId],  references: [schoolSubjects.id] }),
  employee: one(employees,      { fields: [pedagogieInspection.employeeId], references: [employees.id] }),
}));




