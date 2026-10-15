"use server";

import { db } from "@/infrastructure/database";
import { pedagogieRessources } from "@/infrastructure/database/schema/pedagogie";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  getPedagogieRole,
  getPedagogieScope,
  canManageRessources,
} from "@/domains/pedagogie/permissions";

export type RessourceFormData = {
  title: string;
  type: string; // PDF | Vidéo | Audio | Présentation | Exercice | Corrigé | Lien externe | Image
  classId?: number;
  subjectId?: number;
  chapitre?: string;
  lecon?: string;
  fileUrl?: string;
  externalUrl?: string;
  employeeId?: number;
  statut?: string; // Publié | Brouillon | Archivé
};

export type RessourceFilters = {
  classId?: number;
  subjectId?: number;
  type?: string;
  statut?: string;
  employeeId?: number;
};

// ─── Initialize table ────────────────────────────────────────────────────────
export async function initRessourcesTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pedagogie_ressources (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        class_id INTEGER REFERENCES school_classes(id),
        subject_id INTEGER REFERENCES school_subjects(id),
        chapitre VARCHAR(255),
        lecon VARCHAR(255),
        file_url VARCHAR(255),
        external_url VARCHAR(255),
        employee_id INTEGER REFERENCES employees(id),
        statut VARCHAR(30) DEFAULT 'Publié',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initRessourcesTable:", e.message);
    return { success: false, error: e.message };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createRessource(data: RessourceFormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRessources(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const scope = getPedagogieScope(user);
    if (scope.role === "enseignant") {
      if (scope.teacherId && data.employeeId !== scope.teacherId) {
        return { success: false, error: "Accès non autorisé: Vous ne pouvez ajouter des ressources que pour vous-même." };
      }
    }

    const schoolId = await getActiveSchoolId();

    const [ressource] = await db.insert(pedagogieRessources).values({
      schoolId,
      title: data.title,
      type: data.type,
      classId: data.classId || null,
      subjectId: data.subjectId || null,
      chapitre: data.chapitre || null,
      lecon: data.lecon || null,
      fileUrl: data.fileUrl || null,
      externalUrl: data.externalUrl || null,
      employeeId: data.employeeId || null,
      statut: data.statut || "Publié",
    }).returning();

    revalidatePath("/dashboard/pedagogie/ressources");
    return { success: true, data: ressource };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── READ ────────────────────────────────────────────────────────────────────
export async function getRessources(filters: RessourceFilters = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const scope = getPedagogieScope(user);
    if (scope.role === "guest") {
      return { success: false, error: "Accès non autorisé", data: [] };
    }

    const schoolId = await getActiveSchoolId();

    const data = await db.query.pedagogieRessources.findMany({
      where: (t, { and: _and, eq: _eq }) => {
        const conds: any[] = [];

        // Scope filter
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

        // Apply filters
        if (filters.classId) conds.push(_eq(t.classId, filters.classId));
        if (filters.subjectId) conds.push(_eq(t.subjectId, filters.subjectId));
        if (filters.type) conds.push(_eq(t.type, filters.type));
        if (filters.statut) conds.push(_eq(t.statut, filters.statut));
        if (filters.employeeId && scope.role !== "enseignant") conds.push(_eq(t.employeeId, filters.employeeId));

        return _and(...conds);
      },
      with: {
        class: true,
        subject: true,
        employee: true,
      },
      orderBy: (t) => [desc(t.createdAt)],
    });

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message, data: [] };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateRessource(id: number, data: Partial<RessourceFormData>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRessources(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const scope = getPedagogieScope(user);
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.pedagogieRessources.findFirst({
      where: and(eq(pedagogieRessources.id, id), eq(pedagogieRessources.schoolId, schoolId))
    });

    if (!existing) {
      return { success: false, error: "Ressource introuvable" };
    }

    if (scope.role === "enseignant") {
      if (existing.employeeId !== scope.teacherId) {
        return { success: false, error: "Accès non autorisé: Vous ne pouvez modifier que vos propres ressources." };
      }
    }

    await db.update(pedagogieRessources)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(pedagogieRessources.id, id), eq(pedagogieRessources.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/ressources");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function deleteRessource(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageRessources(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const scope = getPedagogieScope(user);
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.pedagogieRessources.findFirst({
      where: and(eq(pedagogieRessources.id, id), eq(pedagogieRessources.schoolId, schoolId))
    });

    if (!existing) {
      return { success: false, error: "Ressource introuvable" };
    }

    if (scope.role === "enseignant") {
      if (existing.employeeId !== scope.teacherId) {
        return { success: false, error: "Accès non autorisé: Vous ne pouvez supprimer que vos propres ressources." };
      }
    }

    await db.delete(pedagogieRessources).where(and(eq(pedagogieRessources.id, id), eq(pedagogieRessources.schoolId, schoolId)));
    revalidatePath("/dashboard/pedagogie/ressources");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
