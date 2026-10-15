"use server";

import { db } from "@/infrastructure/database";
import { cahierTextes } from "@/infrastructure/database/schema/pedagogie";
import { timetableEntries } from "@/infrastructure/database/schema/timetable";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  getPedagogieRole,
  getPedagogieScope,
  canManageCahierTextes,
  canValidateCahierTextes,
} from "@/domains/pedagogie/permissions";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type SeanceFormData = {
  classId: number;
  subjectId: number;
  employeeId: number;
  sessionDate: string;
  heureDebut?: string;
  heureFin?: string;
  titreLecon: string;
  objectifs?: string;
  contenuRealise?: string;
  supportsUtilises?: string;
  devoirDonne?: string;
  observation?: string;
  anneeScolaire?: string;
};

export type SeanceFilters = {
  dateDebut?: string;
  dateFin?: string;
  classId?: number;
  subjectId?: number;
  employeeId?: number;
  statut?: string;
  anneeScolaire?: string;
  search?: string;
};

// ─── Init DB table ─────────────────────────────────────────────────────────────
export async function initCahierTextesTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cahier_textes (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        class_id INTEGER REFERENCES school_classes(id),
        subject_id INTEGER REFERENCES school_subjects(id),
        employee_id INTEGER REFERENCES employees(id),
        session_date DATE NOT NULL,
        heure_debut TIME,
        heure_fin TIME,
        titre_lecon VARCHAR(255) NOT NULL,
        objectifs TEXT,
        contenu_realise TEXT,
        supports_utilises TEXT,
        devoir_donne TEXT,
        observation TEXT,
        statut VARCHAR(30) DEFAULT 'En attente',
        valide_par_id INTEGER REFERENCES employees(id),
        valide_at TIMESTAMP,
        annee_scolaire VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initCahierTextesTable:", e.message);
    return { success: false, error: e.message };
  }
}

// ─── CREATE ────────────────────────────────────────────────────────────────────
export async function createSeance(data: SeanceFormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageCahierTextes(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const scope = getPedagogieScope(user);
    if (scope.role === "enseignant") {
      if (scope.teacherId && data.employeeId !== scope.teacherId) {
        return { success: false, error: "Accès non autorisé: Vous ne pouvez créer de séance que pour vous-même." };
      }
    }

    const schoolId = await getActiveSchoolId();

    const [seance] = await db.insert(cahierTextes).values({
      schoolId,
      classId:          data.classId,
      subjectId:        data.subjectId,
      employeeId:       data.employeeId,
      sessionDate:      data.sessionDate,
      heureDebut:       data.heureDebut || null,
      heureFin:         data.heureFin || null,
      titreLecon:       data.titreLecon,
      objectifs:        data.objectifs || null,
      contenuRealise:   data.contenuRealise || null,
      supportsUtilises: data.supportsUtilises || null,
      devoirDonne:      data.devoirDonne || null,
      observation:      data.observation || null,
      anneeScolaire:    data.anneeScolaire || null,
      statut:           "En attente",
    }).returning();

    revalidatePath("/dashboard/pedagogie/cahier-textes");
    return { success: true, data: seance };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── READ (list with filters) ──────────────────────────────────────────────────
export async function getSeances(filters: SeanceFilters = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const scope = getPedagogieScope(user);
    if (scope.role === "guest") {
      return { success: false, error: "Accès non autorisé", data: [] };
    }

    const schoolId = await getActiveSchoolId();

    const seances = await db.query.cahierTextes.findMany({
      where: (t, { and: _and, eq: _eq, gte: _gte, lte: _lte }) => {
        const conds: any[] = [];

        // Scope limitations
        if (!scope.allSchools && scope.schoolId) {
          conds.push(_eq(t.schoolId, scope.schoolId));
        } else {
          conds.push(_eq(t.schoolId, schoolId));
        }

        if (scope.role === "enseignant" && scope.teacherId) {
          conds.push(_eq(t.employeeId, scope.teacherId));
        } else if (scope.role === "eleve" && user.classId) {
          conds.push(_eq(t.classId, Number(user.classId)));
        } else if (scope.role === "parent" && user.classId) {
          conds.push(_eq(t.classId, Number(user.classId)));
        }

        // Apply dynamic filters
        if (filters.classId)       conds.push(_eq(t.classId, filters.classId));
        if (filters.subjectId)     conds.push(_eq(t.subjectId, filters.subjectId));
        if (filters.employeeId && scope.role !== "enseignant") conds.push(_eq(t.employeeId, filters.employeeId));
        if (filters.statut)        conds.push(_eq(t.statut, filters.statut));
        if (filters.anneeScolaire) conds.push(_eq(t.anneeScolaire, filters.anneeScolaire));
        if (filters.dateDebut)     conds.push(_gte(t.sessionDate, filters.dateDebut));
        if (filters.dateFin)       conds.push(_lte(t.sessionDate, filters.dateFin));

        return _and(...conds);
      },
      with: {
        class:     true,
        subject:   true,
        employee:  true,
        validePar: true,
      },
      orderBy: (t, { desc: _desc }) => [_desc(t.sessionDate)],
    });

    return { success: true, data: seances };
  } catch (e: any) {
    return { success: false, error: e.message, data: [] };
  }
}

// ─── UPDATE ────────────────────────────────────────────────────────────────────
export async function updateSeance(id: number, data: Partial<SeanceFormData>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageCahierTextes(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const scope = getPedagogieScope(user);
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.cahierTextes.findFirst({
      where: and(eq(cahierTextes.id, id), eq(cahierTextes.schoolId, schoolId))
    });

    if (!existing) {
      return { success: false, error: "Séance introuvable" };
    }

    if (scope.role === "enseignant") {
      if (existing.employeeId !== scope.teacherId) {
        return { success: false, error: "Accès non autorisé: Vous ne pouvez modifier que vos propres séances." };
      }
      if (existing.statut === "Validé") {
        return { success: false, error: "Accès non autorisé: Impossible de modifier une séance validée." };
      }
    }

    await db.update(cahierTextes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(cahierTextes.id, id), eq(cahierTextes.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/cahier-textes");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── VALIDATE ─────────────────────────────────────────────────────────────────
export async function validerSeance(id: number, valideParId: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canValidateCahierTextes(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.update(cahierTextes)
      .set({ statut: "Validé", valideParId, valideAt: new Date(), updatedAt: new Date() })
      .where(and(eq(cahierTextes.id, id), eq(cahierTextes.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/cahier-textes");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── REJECT ───────────────────────────────────────────────────────────────────
export async function rejeterSeance(id: number, observation: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canValidateCahierTextes(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.update(cahierTextes)
      .set({ statut: "Rejeté", observation, updatedAt: new Date() })
      .where(and(eq(cahierTextes.id, id), eq(cahierTextes.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/cahier-textes");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── DELETE ────────────────────────────────────────────────────────────────────
export async function deleteSeance(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageCahierTextes(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const scope = getPedagogieScope(user);
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.cahierTextes.findFirst({
      where: and(eq(cahierTextes.id, id), eq(cahierTextes.schoolId, schoolId))
    });

    if (!existing) {
      return { success: false, error: "Séance introuvable" };
    }

    if (scope.role === "enseignant") {
      if (existing.employeeId !== scope.teacherId) {
        return { success: false, error: "Accès non autorisé: Vous ne pouvez supprimer que vos propres séances." };
      }
      if (existing.statut === "Validé") {
        return { success: false, error: "Accès non autorisé: Les enseignants ne peuvent pas supprimer des données validées." };
      }
    }

    await db.delete(cahierTextes).where(and(eq(cahierTextes.id, id), eq(cahierTextes.schoolId, schoolId)));
    revalidatePath("/dashboard/pedagogie/cahier-textes");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getTimetableSlots() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const slots = await db.query.timetableEntries.findMany({
      with: {
        class: true,
        subject: true,
        teacher: true,
      }
    });

    return { success: true, data: slots };
  } catch (e: any) {
    console.error("getTimetableSlots error:", e.message);
    return { success: false, error: e.message, data: [] };
  }
}
