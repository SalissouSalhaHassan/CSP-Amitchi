"use server";

import { db } from "@/infrastructure/database";
import { pedagogieInspection } from "@/infrastructure/database/schema/pedagogie";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  getPedagogieRole,
  getPedagogieScope,
  canManageInspection,
} from "@/domains/pedagogie/permissions";

export type InspectionFormData = {
  visitDate: string;
  employeeId: number;
  classId: number;
  subjectId: number;
  leconObservee: string;
  ponctualite?: string;
  methodologie?: string;
  gestionClasse?: string;
  supportsUtilises?: string;
  noteInspection?: number;
  recommandations?: string;
  status?: string; // "Ouvert" | "En attente" | "Clôturé"
};

// ─── Initialize table ────────────────────────────────────────────────────────
export async function initInspectionTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pedagogie_inspections (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        visit_date DATE NOT NULL,
        employee_id INTEGER REFERENCES employees(id),
        class_id INTEGER REFERENCES school_classes(id),
        subject_id INTEGER REFERENCES school_subjects(id),
        lecon_observee VARCHAR(255) NOT NULL,
        ponctualite VARCHAR(50) DEFAULT 'Satisfaisant',
        methodologie VARCHAR(50) DEFAULT 'Satisfaisant',
        gestion_classe VARCHAR(50) DEFAULT 'Satisfaisant',
        supports_utilises TEXT,
        note_inspection DOUBLE PRECISION,
        recommandations TEXT,
        status VARCHAR(30) DEFAULT 'Ouvert',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initInspectionTable:", e.message);
    return { success: false, error: e.message };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createInspectionVisit(data: InspectionFormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageInspection(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    const [visit] = await db.insert(pedagogieInspection).values({
      schoolId,
      visitDate: data.visitDate,
      employeeId: data.employeeId,
      classId: data.classId,
      subjectId: data.subjectId,
      leconObservee: data.leconObservee,
      ponctualite: data.ponctualite || "Satisfaisant",
      methodologie: data.methodologie || "Satisfaisant",
      gestionClasse: data.gestionClasse || "Satisfaisant",
      supportsUtilises: data.supportsUtilises || null,
      noteInspection: data.noteInspection != null ? data.noteInspection : null,
      recommandations: data.recommandations || null,
      status: data.status || "Ouvert",
    }).returning();

    revalidatePath("/dashboard/pedagogie/inspection");
    return { success: true, data: visit };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── READ ────────────────────────────────────────────────────────────────────
export async function getInspectionVisits() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const scope = getPedagogieScope(user);
    // Students, parents and guests are blocked from seeing inspections entirely
    if (["eleve", "parent", "guest"].includes(scope.role)) {
      return { success: false, error: "Accès non autorisé", data: [] };
    }

    const schoolId = await getActiveSchoolId();

    const data = await db.query.pedagogieInspection.findMany({
      where: (t, { and: _and, eq: _eq }) => {
        const conds: any[] = [];

        // Scope filter
        if (!scope.allSchools && scope.schoolId) {
          conds.push(_eq(t.schoolId, scope.schoolId));
        } else {
          conds.push(_eq(t.schoolId, schoolId));
        }

        // Teachers only see their own inspections
        if (scope.role === "enseignant" && scope.teacherId) {
          conds.push(_eq(t.employeeId, scope.teacherId));
        }

        return _and(...conds);
      },
      with: {
        class: true,
        subject: true,
        employee: true,
      },
      orderBy: (t) => [desc(t.visitDate)],
    });

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message, data: [] };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updateInspectionVisit(id: number, data: Partial<InspectionFormData>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageInspection(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.update(pedagogieInspection)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(pedagogieInspection.id, id), eq(pedagogieInspection.schoolId, schoolId)));

    revalidatePath("/dashboard/pedagogie/inspection");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function deleteInspectionVisit(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    if (!canManageInspection(user)) {
      return { success: false, error: "Accès non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    await db.delete(pedagogieInspection).where(and(eq(pedagogieInspection.id, id), eq(pedagogieInspection.schoolId, schoolId)));
    revalidatePath("/dashboard/pedagogie/inspection");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
