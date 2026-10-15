"use server";

import { db, readDb } from "@/infrastructure/database";
import { getActiveSchoolId, getActiveBranchData } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveEducationalLevel, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";
import { 
  scholarships, 
  studentScholarships, 
  studentPaymentSchedules,
  studentFees,
  feePayments
} from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { eq, desc, and, or, isNull, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ScholarshipInput {
  id?: number;
  name: string;
  provider?: string;
  type?: string; // Pourcentage | Montant Fixe
  discountValue: number;
  appliesTo?: string;
  academicYear?: string;
  criteria?: string;
  isActive?: boolean;
}

export interface StudentScholarshipAssignInput {
  id?: number;
  studentId: number;
  scholarshipId: number;
  academicYear?: string;
  customDiscountPercentage?: number;
  allocatedAmount?: number;
  decisionReference?: string;
  status?: string;
  notes?: string;
}

export interface ScheduleGenerationOptions {
  studentId: number;
  annualGrossAmount?: number;
  scholarshipPercentage?: number;
  scheduleType?: "mensuel_9" | "mensuel_10" | "trimestriel" | "semestriel";
  academicYear?: string;
}

export interface BulkScheduleOptions {
  classId?: number;
  className?: string;
  scheduleType?: "mensuel_9" | "mensuel_10" | "trimestriel" | "semestriel";
  academicYear?: string;
}

const DEFAULT_SCHOLARSHIP_TEMPLATES = [
  {
    name: "Bourse d'Excellence Académique",
    provider: "Ministère de l'Enseignement Supérieur",
    type: "Pourcentage",
    discountValue: 100,
    appliesTo: "Frais de Scolarité",
    academicYear: "2025-2026",
    criteria: "Moyenne générale >= 16/20, assiduité parfaite",
    isActive: true,
  },
  {
    name: "Bourse Nationale au Mérite",
    provider: "Ministère de l'Enseignement Supérieur",
    type: "Pourcentage",
    discountValue: 50,
    appliesTo: "Frais de Scolarité",
    academicYear: "2025-2026",
    criteria: "Moyenne générale >= 14/20 ou recommandation ministérielle",
    isActive: true,
  },
  {
    name: "Bourse d'Étude Régionale / Collectivité",
    provider: "Conseil Régional / Municipalité",
    type: "Pourcentage",
    discountValue: 40,
    appliesTo: "Frais de Scolarité",
    academicYear: "2025-2026",
    criteria: "Ressortissant de la région partenaire",
    isActive: true,
  },
  {
    name: "Bourse Sociale / Aide Étudiante",
    provider: "Fonds d'Action Sociale Universitaire",
    type: "Pourcentage",
    discountValue: 30,
    appliesTo: "Frais de Scolarité",
    academicYear: "2025-2026",
    criteria: "Situation financière familiale précaire justifiée",
    isActive: true,
  },
  {
    name: "Exonération Institutionnelle / Partenariat",
    provider: "Direction Générale de l'Établissement",
    type: "Pourcentage",
    discountValue: 25,
    appliesTo: "Frais de Scolarité",
    academicYear: "2025-2026",
    criteria: "Accords-cadres et conventions institutionnelles",
    isActive: true,
  },
  {
    name: "Réduction Fratrie / Famille Nombreuse",
    provider: "Établissement",
    type: "Pourcentage",
    discountValue: 15,
    appliesTo: "Frais de Scolarité",
    academicYear: "2025-2026",
    criteria: "Au moins 2 enfants inscrits dans l'établissement",
    isActive: true,
  },
];

export async function initializeDefaultScholarships(targetSchoolId?: number) {
  try {
    await ensureFinanceTables();
    const user = await getCurrentUser();
    const schoolId = targetSchoolId || (await getActiveSchoolId()) || user?.schoolId || 9;

    const existing = await (readDb || db)
      .select({ name: scholarships.name })
      .from(scholarships)
      .where(
        schoolId
          ? or(eq(scholarships.schoolId, schoolId), isNull(scholarships.schoolId))
          : undefined
      );

    const existingNames = new Set(existing.map((e) => e.name?.toLowerCase().trim()));

    const toInsert = DEFAULT_SCHOLARSHIP_TEMPLATES
      .filter((tmpl) => !existingNames.has(tmpl.name.toLowerCase().trim()))
      .map((tmpl) => ({
        ...tmpl,
        schoolId,
      }));

    if (toInsert.length > 0) {
      await db.insert(scholarships).values(toInsert);
      console.log(`[initializeDefaultScholarships] Seeded ${toInsert.length} scholarships for school ${schoolId}.`);
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true, count: toInsert.length };
  } catch (err: any) {
    console.error("[initializeDefaultScholarships] Error:", err);
    return { success: false, error: err.message };
  }
}

let migrationPromise: Promise<void> | null = null;

async function ensureFinanceTables() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "scholarships" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "name" varchar(150) NOT NULL,
          "provider" varchar(150) DEFAULT 'Ministère de l''Enseignement Supérieur',
          "type" varchar(50) DEFAULT 'Pourcentage',
          "discount_value" double precision NOT NULL DEFAULT 50.0,
          "applies_to" varchar(50) DEFAULT 'Frais de Scolarité',
          "academic_year" varchar(50),
          "criteria" text,
          "is_active" boolean DEFAULT true,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS "student_scholarships" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
          "scholarship_id" integer REFERENCES "scholarships"("id") ON DELETE CASCADE,
          "academic_year" varchar(50),
          "custom_discount_percentage" double precision,
          "allocated_amount" double precision DEFAULT 0,
          "decision_reference" varchar(100),
          "decision_date" timestamp DEFAULT now(),
          "status" varchar(50) DEFAULT 'Actif',
          "notes" text,
          "created_at" timestamp DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS "student_payment_schedules" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
          "session_id" integer REFERENCES "school_sessions"("id"),
          "installment_number" integer NOT NULL DEFAULT 1,
          "label" varchar(100) NOT NULL,
          "due_date" timestamp NOT NULL,
          "gross_amount" double precision NOT NULL,
          "scholarship_deduction" double precision DEFAULT 0,
          "net_amount" double precision NOT NULL,
          "paid_amount" double precision DEFAULT 0,
          "balance" double precision NOT NULL,
          "status" varchar(50) DEFAULT 'À échoir',
          "reminder_sent_at" timestamp,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
    } catch (err: any) {
      console.warn("ensureFinanceTables warning:", err.message);
    }
  })();

  return migrationPromise;
}

export async function getBoursesAndEcheanciersDashboardData() {
  try {
    await ensureFinanceTables();
    const user = await getCurrentUser();
    const schoolId = (await getActiveSchoolId()) || user?.schoolId || 9;

    // Resolve branch and educational level scope
    const [{ branchData }, activeEduLevel] = await Promise.all([
      getActiveBranchData(user).catch(() => ({ branchData: null, allBranches: [] })),
      getActiveEducationalLevel(user).catch(() => null),
    ]);

    const activeLevel = activeEduLevel ||
      (branchData?.instType && !hasAllEducationalLevels(branchData.instType) ? branchData.instType : null) ||
      (user?.educationalLevel && !hasAllEducationalLevels(user.educationalLevel) ? user.educationalLevel : null);

    const isLevelScoped = Boolean(activeLevel && !hasAllEducationalLevels(activeLevel));

    // 1. Scholarships Catalog
    let allScholarships = await (readDb || db)
      .select()
      .from(scholarships)
      .where(
        schoolId 
          ? or(eq(scholarships.schoolId, schoolId), isNull(scholarships.schoolId)) 
          : undefined
      )
      .orderBy(desc(scholarships.id));

    // Auto-seed default templates if catalog is empty so it is never blank
    if (allScholarships.length === 0) {
      await initializeDefaultScholarships(schoolId);
      allScholarships = await (readDb || db)
        .select()
        .from(scholarships)
        .where(
          schoolId 
            ? or(eq(scholarships.schoolId, schoolId), isNull(scholarships.schoolId)) 
            : undefined
        )
        .orderBy(desc(scholarships.id));
    }

    // 2. Student Scholarship Allocations
    const allocations = await (readDb || db)
      .select({
        id: studentScholarships.id,
        schoolId: studentScholarships.schoolId,
        studentId: studentScholarships.studentId,
        scholarshipId: studentScholarships.scholarshipId,
        academicYear: studentScholarships.academicYear,
        customDiscountPercentage: studentScholarships.customDiscountPercentage,
        allocatedAmount: studentScholarships.allocatedAmount,
        decisionReference: studentScholarships.decisionReference,
        decisionDate: studentScholarships.decisionDate,
        status: studentScholarships.status,
        notes: studentScholarships.notes,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        studentClasse: students.classe,
        studentMobile: students.mobile,
        studentWhatsapp: students.whatsapp,
        scholarshipName: scholarships.name,
        scholarshipProvider: scholarships.provider,
        scholarshipType: scholarships.type,
        scholarshipDiscountValue: scholarships.discountValue,
      })
      .from(studentScholarships)
      .leftJoin(students, eq(studentScholarships.studentId, students.id))
      .leftJoin(scholarships, eq(studentScholarships.scholarshipId, scholarships.id))
      .where(schoolId ? eq(studentScholarships.schoolId, schoolId) : undefined)
      .orderBy(desc(studentScholarships.id));

    // 3. Payment Schedules
    const rawSchedules = await (readDb || db)
      .select({
        id: studentPaymentSchedules.id,
        schoolId: studentPaymentSchedules.schoolId,
        studentId: studentPaymentSchedules.studentId,
        installmentNumber: studentPaymentSchedules.installmentNumber,
        label: studentPaymentSchedules.label,
        dueDate: studentPaymentSchedules.dueDate,
        grossAmount: studentPaymentSchedules.grossAmount,
        scholarshipDeduction: studentPaymentSchedules.scholarshipDeduction,
        netAmount: studentPaymentSchedules.netAmount,
        paidAmount: studentPaymentSchedules.paidAmount,
        balance: studentPaymentSchedules.balance,
        status: studentPaymentSchedules.status,
        reminderSentAt: studentPaymentSchedules.reminderSentAt,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        studentClasse: students.classe,
        studentMobile: students.mobile,
        studentWhatsapp: students.whatsapp,
        studentNomPere: students.nomPere,
      })
      .from(studentPaymentSchedules)
      .leftJoin(students, eq(studentPaymentSchedules.studentId, students.id))
      .where(schoolId ? eq(studentPaymentSchedules.schoolId, schoolId) : undefined)
      .orderBy(desc(studentPaymentSchedules.dueDate))
      .limit(1000);

    const now = new Date();
    const schedules = rawSchedules.map((s) => {
      const isPast = new Date(s.dueDate) < now;
      let computedStatus = s.status;
      if (s.balance === 0 || ((s.paidAmount || 0) >= s.netAmount && s.netAmount > 0)) {
        computedStatus = "Payé";
      } else if (s.status === "Relancé") {
        computedStatus = "Relancé";
      } else if (isPast && s.balance > 0) {
        computedStatus = "En retard";
      }
      return {
        ...s,
        status: computedStatus,
      };
    });

    let finalAllocations = allocations;
    let finalSchedules = schedules;

    if (isLevelScoped && activeLevel) {
      finalAllocations = allocations.filter(a => isStudentInEducationalLevel({ classe: a.studentClasse }, activeLevel));
      finalSchedules = schedules.filter(s => isStudentInEducationalLevel({ classe: s.studentClasse }, activeLevel));
    }

    // 4. Calculate Aggregate KPIs
    const totalAllocatedBourses = finalAllocations.reduce((acc, curr) => acc + Number(curr.allocatedAmount || 0), 0);
    const totalGrossSchedules = finalSchedules.reduce((acc, curr) => acc + Number(curr.grossAmount || 0), 0);
    const totalNetSchedules = finalSchedules.reduce((acc, curr) => acc + Number(curr.netAmount || 0), 0);
    const totalPaidSchedules = finalSchedules.reduce((acc, curr) => acc + Number(curr.paidAmount || 0), 0);
    const totalOverdueSchedules = finalSchedules
      .filter((s) => s.status === "En retard" || (s.balance > 0 && new Date(s.dueDate) < now))
      .reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

    const boursiersCount = finalAllocations.filter((a) => a.status === "Actif").length;

    return {
      success: true,
      data: {
        scholarships: allScholarships,
        allocations: finalAllocations,
        schedules: finalSchedules,
        metrics: {
          boursiersCount,
          totalAllocatedBourses,
          totalGrossSchedules,
          totalNetSchedules,
          totalPaidSchedules,
          totalOverdueSchedules,
          recoveryRate: totalNetSchedules > 0 ? Number(((totalPaidSchedules / totalNetSchedules) * 100).toFixed(1)) : 0,
        },
      },
    };
  } catch (error: any) {
    console.error("Error in getBoursesAndEcheanciersDashboardData:", error);
    return { success: false, error: error.message || "Erreur lors de la récupération des bourses" };
  }
}

export async function saveScholarship(input: ScholarshipInput) {
  try {
    const user = await getCurrentUser();
    const schoolId = (await getActiveSchoolId()) || user?.schoolId || 9;

    if (!input.name) {
      return { success: false, error: "Nom de la bourse requis" };
    }

    if (input.id) {
      await db
        .update(scholarships)
        .set({
          name: input.name,
          provider: input.provider || "Ministère de l'Enseignement Supérieur",
          type: input.type || "Pourcentage",
          discountValue: Number(input.discountValue || 50),
          appliesTo: input.appliesTo || "Frais de Scolarité",
          academicYear: input.academicYear || "2025-2026",
          criteria: input.criteria || "",
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(scholarships.id, input.id));
    } else {
      await db.insert(scholarships).values({
        schoolId,
        name: input.name,
        provider: input.provider || "Ministère de l'Enseignement Supérieur",
        type: input.type || "Pourcentage",
        discountValue: Number(input.discountValue || 50),
        appliesTo: input.appliesTo || "Frais de Scolarité",
        academicYear: input.academicYear || "2025-2026",
        criteria: input.criteria || "",
        isActive: input.isActive ?? true,
      });
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in saveScholarship:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de la bourse" };
  }
}

export async function deleteScholarship(id: number) {
  try {
    await db.delete(scholarships).where(eq(scholarships.id, id));
    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteScholarship:", error);
    return { success: false, error: error.message || "Erreur lors de la suppression" };
  }
}

export async function assignScholarshipToStudent(input: StudentScholarshipAssignInput) {
  try {
    const schoolId = await getActiveSchoolId();

    if (!input.studentId || !input.scholarshipId) {
      return { success: false, error: "Étudiant et Bourse requis" };
    }

    // Fetch scholarship info
    const sch = await (readDb || db)
      .select()
      .from(scholarships)
      .where(eq(scholarships.id, input.scholarshipId))
      .limit(1);

    const schItem = sch[0];
    const discountVal = input.customDiscountPercentage || schItem?.discountValue || 50;

    // Fetch existing student fee
    const feeList = await (readDb || db)
      .select()
      .from(studentFees)
      .where(eq(studentFees.studentId, input.studentId))
      .limit(1);

    const baseTuition = feeList[0]?.totalExpected || 700000;
    const allocatedAmt = schItem?.type === "Pourcentage"
      ? Math.round((baseTuition * discountVal) / 100)
      : Math.round(input.allocatedAmount || discountVal);

    const ref = input.decisionReference || `DEC-BRS-${Date.now().toString().slice(-6)}`;

    if (input.id) {
      await db
        .update(studentScholarships)
        .set({
          studentId: input.studentId,
          scholarshipId: input.scholarshipId,
          academicYear: input.academicYear || "2025-2026",
          customDiscountPercentage: discountVal,
          allocatedAmount: allocatedAmt,
          decisionReference: ref,
          status: input.status || "Actif",
          notes: input.notes || "",
        })
        .where(eq(studentScholarships.id, input.id));
    } else {
      await db.insert(studentScholarships).values({
        schoolId: schoolId || 1,
        studentId: input.studentId,
        scholarshipId: input.scholarshipId,
        academicYear: input.academicYear || "2025-2026",
        customDiscountPercentage: discountVal,
        allocatedAmount: allocatedAmt,
        decisionReference: ref,
        status: input.status || "Actif",
        notes: input.notes || "",
      });
    }

    // Direct synchronization with studentFees ledger
    if (feeList[0]) {
      const currentPaid = feeList[0].totalPaid || 0;
      const newBalance = Math.max(0, feeList[0].totalExpected - currentPaid - allocatedAmt);
      const newStatus = newBalance <= 0 ? "Soldé" : currentPaid > 0 ? "Partiel" : "Impayé";
      await db
        .update(studentFees)
        .set({
          totalReduction: allocatedAmt,
          balance: newBalance,
          status: newStatus,
        })
        .where(eq(studentFees.id, feeList[0].id));
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    revalidatePath("/dashboard/finance");
    return { success: true, allocatedAmount: allocatedAmt };
  } catch (error: any) {
    console.error("Error in assignScholarshipToStudent:", error);
    return { success: false, error: error.message || "Erreur lors de l'attribution de la bourse" };
  }
}

export async function deleteStudentScholarship(id: number) {
  try {
    const existing = await (readDb || db)
      .select()
      .from(studentScholarships)
      .where(eq(studentScholarships.id, id))
      .limit(1);

    if (existing[0]) {
      const studentId = existing[0].studentId;
      await db.delete(studentScholarships).where(eq(studentScholarships.id, id));

      // Reset reduction in studentFees
      if (studentId) {
        const feeList = await (readDb || db)
          .select()
          .from(studentFees)
          .where(eq(studentFees.studentId, studentId))
          .limit(1);

        if (feeList[0]) {
          const currentPaid = feeList[0].totalPaid || 0;
          const newBalance = Math.max(0, feeList[0].totalExpected - currentPaid);
          const newStatus = newBalance <= 0 ? "Soldé" : currentPaid > 0 ? "Partiel" : "Impayé";
          await db
            .update(studentFees)
            .set({
              totalReduction: 0,
              balance: newBalance,
              status: newStatus,
            })
            .where(eq(studentFees.id, feeList[0].id));
        }
      }
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    revalidatePath("/dashboard/finance");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteStudentScholarship:", error);
    return { success: false, error: error.message || "Erreur lors de la suppression" };
  }
}

interface InstallmentPlanItem {
  installmentNumber: number;
  label: string;
  dueDate: Date;
  sharePercent: number; // e.g. 11.11% or 40%
}

function buildInstallmentBlueprint(
  scheduleType: "mensuel_9" | "mensuel_10" | "trimestriel" | "semestriel",
  startYear: number = 2025
): InstallmentPlanItem[] {
  if (scheduleType === "trimestriel") {
    return [
      { installmentNumber: 1, label: "Tranche 1 (Octobre)", dueDate: new Date(startYear, 9, 15), sharePercent: 0.40 },
      { installmentNumber: 2, label: "Tranche 2 (Janvier)", dueDate: new Date(startYear + 1, 0, 15), sharePercent: 0.30 },
      { installmentNumber: 3, label: "Tranche 3 (Avril)", dueDate: new Date(startYear + 1, 3, 15), sharePercent: 0.30 },
    ];
  }

  if (scheduleType === "semestriel") {
    return [
      { installmentNumber: 1, label: "Semestre 1 (Rentrée)", dueDate: new Date(startYear, 9, 15), sharePercent: 0.50 },
      { installmentNumber: 2, label: "Semestre 2 (Mi-Parcours)", dueDate: new Date(startYear + 1, 1, 15), sharePercent: 0.50 },
    ];
  }

  if (scheduleType === "mensuel_10") {
    const months = [
      "Septembre", "Octobre", "Novembre", "Décembre",
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"
    ];
    return months.map((m, idx) => {
      const monthIdx = (8 + idx) % 12;
      const year = idx < 4 ? startYear : startYear + 1;
      return {
        installmentNumber: idx + 1,
        label: `Mensualité ${m} ${year}`,
        dueDate: new Date(year, monthIdx, 5),
        sharePercent: 0.10,
      };
    });
  }

  // Default: mensuel_9
  const months9 = [
    "Octobre", "Novembre", "Décembre",
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"
  ];
  return months9.map((m, idx) => {
    const monthIdx = (9 + idx) % 12;
    const year = idx < 3 ? startYear : startYear + 1;
    return {
      installmentNumber: idx + 1,
      label: `Mensualité ${m} ${year}`,
      dueDate: new Date(year, monthIdx, 5),
      sharePercent: 1 / 9,
    };
  });
}

export async function generateStudentPaymentSchedule(
  optionsOrStudentId: ScheduleGenerationOptions | number,
  legacyAnnualGross: number = 700000,
  legacyDiscount: number = 0,
  legacyMonths: number = 9
) {
  try {
    const schoolId = await getActiveSchoolId();

    const studentId = typeof optionsOrStudentId === "number" ? optionsOrStudentId : optionsOrStudentId.studentId;
    const scheduleType = typeof optionsOrStudentId === "object" && optionsOrStudentId.scheduleType 
      ? optionsOrStudentId.scheduleType 
      : legacyMonths === 10 ? "mensuel_10" : "mensuel_9";

    // 1. Fetch real student fees if exists
    const feeList = await (readDb || db)
      .select()
      .from(studentFees)
      .where(eq(studentFees.studentId, studentId))
      .limit(1);

    let annualGross = legacyAnnualGross;
    if (typeof optionsOrStudentId === "object" && optionsOrStudentId.annualGrossAmount) {
      annualGross = optionsOrStudentId.annualGrossAmount;
    } else if (feeList[0]?.totalExpected && feeList[0].totalExpected > 0) {
      annualGross = feeList[0].totalExpected;
    }

    // 2. Check active scholarship
    const studentBourse = await (readDb || db)
      .select()
      .from(studentScholarships)
      .where(and(eq(studentScholarships.studentId, studentId), eq(studentScholarships.status, "Actif")))
      .limit(1);

    let effectiveDiscountPercent = typeof optionsOrStudentId === "object" && optionsOrStudentId.scholarshipPercentage !== undefined
      ? optionsOrStudentId.scholarshipPercentage
      : legacyDiscount;

    if (studentBourse[0]?.customDiscountPercentage) {
      effectiveDiscountPercent = Number(studentBourse[0].customDiscountPercentage);
    }

    const totalScholarship = Math.round((annualGross * effectiveDiscountPercent) / 100);
    const totalNet = annualGross - totalScholarship;

    // 3. Build installments blueprint
    const blueprint = buildInstallmentBlueprint(scheduleType);
    const count = blueprint.length;

    // Delete existing schedules for this student
    await db.delete(studentPaymentSchedules).where(eq(studentPaymentSchedules.studentId, studentId));

    // Distribute amounts cleanly
    let distributedGross = 0;
    let distributedScholarship = 0;
    let distributedNet = 0;

    const now = new Date();

    for (let i = 0; i < count; i++) {
      const bp = blueprint[i];
      const isLast = i === count - 1;

      const instGross = isLast ? (annualGross - distributedGross) : Math.round(annualGross * bp.sharePercent);
      const instScholarship = isLast ? (totalScholarship - distributedScholarship) : Math.round(totalScholarship * bp.sharePercent);
      const instNet = isLast ? (totalNet - distributedNet) : (instGross - instScholarship);

      distributedGross += instGross;
      distributedScholarship += instScholarship;
      distributedNet += instNet;

      const isPast = bp.dueDate < now;

      await db.insert(studentPaymentSchedules).values({
        schoolId: schoolId || 1,
        studentId,
        installmentNumber: bp.installmentNumber,
        label: bp.label,
        dueDate: bp.dueDate,
        grossAmount: instGross,
        scholarshipDeduction: instScholarship,
        netAmount: instNet,
        paidAmount: 0,
        balance: instNet,
        status: isPast ? "En retard" : "À échoir",
      });
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true, count, totalNet, totalGross: annualGross, totalScholarship };
  } catch (error: any) {
    console.error("Error in generateStudentPaymentSchedule:", error);
    return { success: false, error: error.message || "Erreur lors de la génération de l'échéancier" };
  }
}

export async function generateBulkPaymentSchedules(params: BulkScheduleOptions) {
  try {
    const schoolId = await getActiveSchoolId();
    const { classId, className, scheduleType = "mensuel_9" } = params;

    let targetStudents: any[] = [];

    if (classId) {
      targetStudents = await (readDb || db)
        .select({
          id: students.id,
          nom: students.nomEtudiant,
          classe: students.classe,
          fraisMensuels: students.fraisMensuels,
        })
        .from(students)
        .where(
          and(
            schoolId ? eq(students.schoolId, schoolId) : undefined,
            eq(students.classId, classId),
            eq(students.statut, "Actif")
          )
        );
    } else if (className) {
      targetStudents = await (readDb || db)
        .select({
          id: students.id,
          nom: students.nomEtudiant,
          classe: students.classe,
          fraisMensuels: students.fraisMensuels,
        })
        .from(students)
        .where(
          and(
            schoolId ? eq(students.schoolId, schoolId) : undefined,
            eq(students.classe, className),
            eq(students.statut, "Actif")
          )
        );
    }

    if (!targetStudents || targetStudents.length === 0) {
      return { success: false, error: "Aucun étudiant actif trouvé pour cette classe" };
    }

    let processedCount = 0;
    let totalInstallmentsCreated = 0;

    for (const st of targetStudents) {
      const res = await generateStudentPaymentSchedule({
        studentId: st.id,
        scheduleType,
      });

      if (res.success) {
        processedCount++;
        totalInstallmentsCreated += res.count || 0;
      }
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return {
      success: true,
      processedStudents: processedCount,
      totalInstallments: totalInstallmentsCreated,
    };
  } catch (error: any) {
    console.error("Error in generateBulkPaymentSchedules:", error);
    return { success: false, error: error.message || "Erreur lors de la génération groupée" };
  }
}

export async function recordSchedulePayment(
  scheduleId: number, 
  paidAmount: number, 
  paymentMode: string = "Espèces",
  reference?: string
) {
  try {
    const user = await getCurrentUser();
    const schoolId = await getActiveSchoolId();

    const item = await (readDb || db)
      .select()
      .from(studentPaymentSchedules)
      .where(eq(studentPaymentSchedules.id, scheduleId))
      .limit(1);

    if (!item[0]) return { success: false, error: "Échéance introuvable" };

    const sched = item[0];
    const newPaid = Number(sched.paidAmount || 0) + paidAmount;
    const newBalance = Math.max(0, Number(sched.netAmount) - newPaid);
    const newStatus = newBalance === 0 ? "Payé" : newPaid > 0 ? "Partiel" : "En retard";

    // 1. Update Installment Schedule
    await db
      .update(studentPaymentSchedules)
      .set({
        paidAmount: newPaid,
        balance: newBalance,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(studentPaymentSchedules.id, scheduleId));

    // 2. Synchronize with studentFees & feePayments ledger
    const paymentRef = reference || `REG-ECH-${sched.installmentNumber}-${Date.now().toString().slice(-5)}`;

    if (sched.studentId) {
      const feeList = await (readDb || db)
        .select()
        .from(studentFees)
        .where(eq(studentFees.studentId, sched.studentId))
        .limit(1);

      if (feeList[0]) {
        const fee = feeList[0];
        // Record payment transaction
        await db.insert(feePayments).values({
          schoolId: schoolId || fee.schoolId || 1,
          feeId: fee.id,
          amount: paidAmount,
          reduction: 0,
          paymentMode: paymentMode || "Espèces",
          reference: paymentRef,
          receiptToken: `REC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
          monthConcerned: sched.label,
          datePaid: new Date(),
          recordedBy: user?.nomPrenom || user?.utilisateur || "Comptable",
        });

        // Update student overall fee totals
        const totalPaidAcc = (fee.totalPaid || 0) + paidAmount;
        const totalReduc = fee.totalReduction || 0;
        const feeNewBalance = Math.max(0, fee.totalExpected - totalPaidAcc - totalReduc);
        const feeNewStatus = feeNewBalance <= 0 ? "Soldé" : totalPaidAcc > 0 ? "Partiel" : "Impayé";

        await db
          .update(studentFees)
          .set({
            totalPaid: totalPaidAcc,
            balance: feeNewBalance,
            status: feeNewStatus,
          })
          .where(eq(studentFees.id, fee.id));
      }
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    revalidatePath("/dashboard/finance");
    return { success: true, paymentRef, newBalance };
  } catch (error: any) {
    console.error("Error in recordSchedulePayment:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement du règlement" };
  }
}

export async function triggerScheduleReminder(scheduleId: number) {
  try {
    const item = await (readDb || db)
      .select({
        id: studentPaymentSchedules.id,
        installmentNumber: studentPaymentSchedules.installmentNumber,
        label: studentPaymentSchedules.label,
        dueDate: studentPaymentSchedules.dueDate,
        netAmount: studentPaymentSchedules.netAmount,
        balance: studentPaymentSchedules.balance,
        studentId: studentPaymentSchedules.studentId,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        studentClasse: students.classe,
        studentMobile: students.mobile,
        studentWhatsapp: students.whatsapp,
        studentNomPere: students.nomPere,
      })
      .from(studentPaymentSchedules)
      .leftJoin(students, eq(studentPaymentSchedules.studentId, students.id))
      .where(eq(studentPaymentSchedules.id, scheduleId))
      .limit(1);

    if (!item[0]) return { success: false, error: "Échéance introuvable" };

    const s = item[0];

    // Mark as Relancé
    await db
      .update(studentPaymentSchedules)
      .set({
        status: "Relancé",
        reminderSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentPaymentSchedules.id, scheduleId));

    // Construct WhatsApp Link and message template
    const phone = (s.studentWhatsapp || s.studentMobile || "").replace(/[^0-9]/g, "");
    const formattedDate = new Date(s.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const formattedBalance = Number(s.balance).toLocaleString("fr-FR");

    const messageText = `*AVIS DE RAPPEL - SERVICE FINANCIER UNIVERSITAIRE*\n` +
      `Bonjour Monsieur/Madame,\n` +
      `Nous vous rappelons que l'échéance *${s.label}* pour l'étudiant(e) *${(s.studentNom || "").toUpperCase()}* (Matricule: ${s.studentMatricule || "N/A"}, Classe: ${s.studentClasse || ""}) ` +
      `est arrivée à échéance le *${formattedDate}*.\n\n` +
      `📌 *Montant restant dû :* ${formattedBalance} FCFA\n\n` +
      `Merci de bien vouloir régulariser cette situation auprès du Service Comptabilité ou par virement / Mobile Money afin d'éviter toute suspension de l'accès aux examens et cours.\n` +
      `_Direction des Affaires Financières & du Recouvrement_`;

    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodedMsg}` : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return {
      success: true,
      whatsappUrl,
      phone,
      studentNom: s.studentNom,
      balance: s.balance,
      messageText,
    };
  } catch (error: any) {
    console.error("Error in triggerScheduleReminder:", error);
    return { success: false, error: error.message || "Erreur lors de l'envoi de la relance" };
  }
}
