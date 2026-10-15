"use server";

import { db, readDb } from "@/infrastructure/database";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { 
  lmdCreditEquivalences, 
  universityPrograms, 
  lmdUnitesEnseignement,
  studentLmdUeResults,
  studentLmdSemesters
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CreditEquivalenceInput {
  id?: number;
  studentId: number;
  originInstitution: string;
  originCountry?: string;
  originProgram?: string;
  academicYear?: string;
  targetProgramId: number;
  targetLevel: string; // L1, L2, L3, M1, M2
  targetSemester: string; // S1 .. S6
  creditsTransferred: number;
  equivalentUesJson?: string;
  decision?: string; // Validé | Rejeté | En Commission
  commissionPresident?: string;
  commissionComments?: string;
  certificateNumber?: string;
}

let migrationPromise: Promise<void> | null = null;

async function ensureEquivalencesTable() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "lmd_credit_equivalences" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
          "origin_institution" varchar(200) NOT NULL,
          "origin_country" varchar(100) DEFAULT 'International',
          "origin_program" varchar(200),
          "academic_year" varchar(50),
          "target_program_id" integer REFERENCES "university_programs"("id"),
          "target_level" varchar(50) DEFAULT 'L2',
          "target_semester" varchar(50) DEFAULT 'S3',
          "credits_transferred" double precision NOT NULL DEFAULT 60.0,
          "equivalent_ues_json" text,
          "decision" varchar(50) DEFAULT 'Validé',
          "decision_date" timestamp DEFAULT now(),
          "commission_president" varchar(150),
          "commission_comments" text,
          "certificate_number" varchar(100),
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        )
      `);
    } catch (err: any) {
      console.warn("ensureEquivalencesTable warning:", err.message);
    }
  })();

  return migrationPromise;
}

export async function getEquivalencesList() {
  try {
    await ensureEquivalencesTable();
    const schoolId = await getActiveSchoolId();

    const records = await (readDb || db)
      .select({
        id: lmdCreditEquivalences.id,
        schoolId: lmdCreditEquivalences.schoolId,
        studentId: lmdCreditEquivalences.studentId,
        originInstitution: lmdCreditEquivalences.originInstitution,
        originCountry: lmdCreditEquivalences.originCountry,
        originProgram: lmdCreditEquivalences.originProgram,
        academicYear: lmdCreditEquivalences.academicYear,
        targetProgramId: lmdCreditEquivalences.targetProgramId,
        targetLevel: lmdCreditEquivalences.targetLevel,
        targetSemester: lmdCreditEquivalences.targetSemester,
        creditsTransferred: lmdCreditEquivalences.creditsTransferred,
        equivalentUesJson: lmdCreditEquivalences.equivalentUesJson,
        decision: lmdCreditEquivalences.decision,
        decisionDate: lmdCreditEquivalences.decisionDate,
        commissionPresident: lmdCreditEquivalences.commissionPresident,
        commissionComments: lmdCreditEquivalences.commissionComments,
        certificateNumber: lmdCreditEquivalences.certificateNumber,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        programName: universityPrograms.name,
      })
      .from(lmdCreditEquivalences)
      .leftJoin(students, eq(lmdCreditEquivalences.studentId, students.id))
      .leftJoin(universityPrograms, eq(lmdCreditEquivalences.targetProgramId, universityPrograms.id))
      .where(schoolId ? eq(lmdCreditEquivalences.schoolId, schoolId) : undefined)
      .orderBy(desc(lmdCreditEquivalences.id));

    return { success: true, data: records };
  } catch (error: any) {
    console.error("Error in getEquivalencesList:", error);
    return { success: false, error: error.message || "Erreur lors de la récupération des équivalences" };
  }
}

export async function saveCreditEquivalence(input: CreditEquivalenceInput) {
  try {
    await ensureEquivalencesTable();
    const schoolId = await getActiveSchoolId();

    if (!input.studentId) {
      return { success: false, error: "Étudiant requis" };
    }
    if (!input.originInstitution) {
      return { success: false, error: "Établissement d'origine requis" };
    }
    if (!input.targetProgramId) {
      return { success: false, error: "Programme d'accueil requis" };
    }

    const certNum = input.certificateNumber || `EQ-ECTS-${Date.now().toString().slice(-6)}`;

    if (input.id) {
      // Update
      await db
        .update(lmdCreditEquivalences)
        .set({
          studentId: input.studentId,
          originInstitution: input.originInstitution,
          originCountry: input.originCountry || "International",
          originProgram: input.originProgram || "Licence",
          academicYear: input.academicYear || "2025-2026",
          targetProgramId: input.targetProgramId,
          targetLevel: input.targetLevel || "L2",
          targetSemester: input.targetSemester || "S3",
          creditsTransferred: Number(input.creditsTransferred || 60),
          equivalentUesJson: input.equivalentUesJson || "[]",
          decision: input.decision || "Validé",
          commissionPresident: input.commissionPresident || "Président de Commission",
          commissionComments: input.commissionComments || "",
          certificateNumber: certNum,
          updatedAt: new Date(),
        })
        .where(eq(lmdCreditEquivalences.id, input.id));
    } else {
      // Insert
      await db.insert(lmdCreditEquivalences).values({
        schoolId: schoolId || 1,
        studentId: input.studentId,
        originInstitution: input.originInstitution,
        originCountry: input.originCountry || "International",
        originProgram: input.originProgram || "Licence",
        academicYear: input.academicYear || "2024-2025",
        targetProgramId: input.targetProgramId,
        targetLevel: input.targetLevel || "L2",
        targetSemester: input.targetSemester || "S3",
        creditsTransferred: Number(input.creditsTransferred || 60),
        equivalentUesJson: input.equivalentUesJson || "[]",
        decision: input.decision || "Validé",
        commissionPresident: input.commissionPresident || "Président de Commission",
        commissionComments: input.commissionComments || "",
        certificateNumber: certNum,
      });
    }

    revalidatePath("/dashboard/academics/lmd/equivalences");
    revalidatePath("/dashboard/academics/lmd/student-trajectory");
    return { success: true };
  } catch (error: any) {
    console.error("Error in saveCreditEquivalence:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de l'équivalence" };
  }
}

export async function deleteCreditEquivalence(id: number) {
  try {
    await ensureEquivalencesTable();
    await db.delete(lmdCreditEquivalences).where(eq(lmdCreditEquivalences.id, id));
    revalidatePath("/dashboard/academics/lmd/equivalences");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCreditEquivalence:", error);
    return { success: false, error: error.message || "Erreur lors de la suppression" };
  }
}
