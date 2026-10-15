"use server";

import { db } from "@/infrastructure/database";
import { cogesPayments } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { asc, desc, ilike, or, eq, and, inArray, sql } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { revalidatePath } from "next/cache";
import { getActiveEducationalLevel, getCompatibleLevels, getUserRoleType } from "@/domains/auth/services/rbac";

async function ensureCogesPaymentsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "coges_payments" (
      "id" serial PRIMARY KEY,
      "school_id" integer,
      "receipt_number" varchar(50) NOT NULL UNIQUE,
      "student_id" integer,
      "classe" varchar(100),
      "session" varchar(50),
      "amount" double precision NOT NULL,
      "amount_letters" varchar(255),
      "received_from" varchar(255) NOT NULL,
      "purpose" varchar(255),
      "date_paid" timestamp DEFAULT now(),
      "status" varchar(20) DEFAULT 'Validé',
      "recorded_by" varchar(100),
      "created_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "school_id" integer`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "receipt_number" varchar(50)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "student_id" integer`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "classe" varchar(100)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "session" varchar(50)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "amount" double precision`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "amount_letters" varchar(255)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "received_from" varchar(255)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "purpose" varchar(255)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "date_paid" timestamp DEFAULT now()`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'Validé'`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "recorded_by" varchar(100)`);
  await db.execute(sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "coges_payments_school_id_idx" ON "coges_payments" ("school_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "coges_payments_student_id_idx" ON "coges_payments" ("student_id")`);
}

export async function createCogesPayment(data: {
  amount: number;
  amountLetters: string;
  receivedFrom: string;
  purpose: string;
  studentId?: number;
  classe?: string;
  session?: string;
}) {
  return protectedDbAction("Finance", "canEdit", async () => {
    const user = await getCurrentUser();
    const schoolId = await getActiveSchoolId();
    await ensureCogesPaymentsTable();
    
    // Generate a receipt number
    const existing = await db
      .select({ id: cogesPayments.id })
      .from(cogesPayments)
      .where(eq(cogesPayments.schoolId, schoolId))
      .orderBy(desc(cogesPayments.id))
      .limit(1);
    let nextId = 1;
    if (existing && existing.length > 0) {
      nextId = existing[0].id + 1;
    }
    const receiptNumber = String(nextId).padStart(6, "0");

    let studentClasse = data.classe || null;
    if (data.studentId && !studentClasse) {
      const [student] = await db
        .select({ classe: students.classe })
        .from(students)
        .where(and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)));
      if (student) {
        studentClasse = student.classe;
      }
    }

    const [payment] = await db
      .insert(cogesPayments)
      .values({
        schoolId,
        receiptNumber,
        amount: data.amount,
        amountLetters: data.amountLetters,
        receivedFrom: data.receivedFrom,
        purpose: data.purpose,
        studentId: data.studentId,
        classe: studentClasse,
        session: data.session || "2025/2026",
        recordedBy: user?.utilisateur || "System",
      })
      .returning({
        id: cogesPayments.id,
        receiptNumber: cogesPayments.receiptNumber,
        studentId: cogesPayments.studentId,
        classe: cogesPayments.classe,
        session: cogesPayments.session,
        amount: cogesPayments.amount,
        amountLetters: cogesPayments.amountLetters,
        receivedFrom: cogesPayments.receivedFrom,
        purpose: cogesPayments.purpose,
        datePaid: cogesPayments.datePaid,
        status: cogesPayments.status,
        recordedBy: cogesPayments.recordedBy,
        createdAt: cogesPayments.createdAt,
      });

    revalidatePath("/dashboard/coges");
    return payment;
  });
}

export async function getCogesPayments() {
  return protectedDbAction("Finance", "canView", async () => {
    const user = await getCurrentUser();
    const roleType = await getUserRoleType(user);
    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    await ensureCogesPaymentsTable();
    
    let whereClause = eq(cogesPayments.schoolId, schoolId);
    if (roleType === "level_director" && activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      whereClause = and(whereClause, inArray(students.educationalLevel, compatibleLevels)) as any;
    }

    return await db
      .select({
        id: cogesPayments.id,
        receiptNumber: cogesPayments.receiptNumber,
        studentId: cogesPayments.studentId,
        classe: cogesPayments.classe,
        session: cogesPayments.session,
        amount: cogesPayments.amount,
        amountLetters: cogesPayments.amountLetters,
        receivedFrom: cogesPayments.receivedFrom,
        purpose: cogesPayments.purpose,
        datePaid: cogesPayments.datePaid,
        status: cogesPayments.status,
        recordedBy: cogesPayments.recordedBy,
        createdAt: cogesPayments.createdAt,
        studentName: students.nomEtudiant,
        studentNumAdmission: students.numAdmission,
      })
      .from(cogesPayments)
      .leftJoin(students, eq(cogesPayments.studentId, students.id))
      .where(whereClause)
      .orderBy(desc(cogesPayments.createdAt));
  });
}

export async function getCogesStudentLedger() {
  return protectedDbAction("Finance", "canView", async () => {
    const user = await getCurrentUser();
    const roleType = await getUserRoleType(user);
    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    await ensureCogesPaymentsTable();
    const configuredExpected = Number(
      process.env.COGES_ANNUAL_AMOUNT || process.env.NEXT_PUBLIC_COGES_ANNUAL_AMOUNT || 0
    ) || 0;

    const studentConditions = [eq(students.schoolId, schoolId)];

    if (roleType === "level_director" && activeLevel) {
      studentConditions.push(inArray(students.educationalLevel, getCompatibleLevels(activeLevel)));
    }

    const studentRows = await db
      .select({
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
        classe: students.classe,
        nomPere: students.nomPere,
        mobile: students.mobile,
        photoPath: students.photoPath,
      })
      .from(students)
      .where(and(...studentConditions))
      .orderBy(asc(students.nomEtudiant));

    const paymentRows = await db
      .select({
        id: cogesPayments.id,
        receiptNumber: cogesPayments.receiptNumber,
        studentId: cogesPayments.studentId,
        amount: cogesPayments.amount,
        receivedFrom: cogesPayments.receivedFrom,
        purpose: cogesPayments.purpose,
        datePaid: cogesPayments.datePaid,
        status: cogesPayments.status,
      })
      .from(cogesPayments)
      .where(eq(cogesPayments.schoolId, schoolId))
      .orderBy(desc(cogesPayments.datePaid));

    const validPaymentsByStudent = new Map<number, typeof paymentRows>();
    for (const payment of paymentRows) {
      if (!payment.studentId || payment.status === "Annulé") continue;
      const current = validPaymentsByStudent.get(payment.studentId) || [];
      current.push(payment);
      validPaymentsByStudent.set(payment.studentId, current);
    }

    return studentRows.map((student) => {
      const studentPayments = validPaymentsByStudent.get(student.id) || [];
      const totalPaid = studentPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const expected = Math.max(configuredExpected, totalPaid);
      const balance = Math.max(expected - totalPaid, 0);
      const lastPayment = studentPayments[0];
      const status = expected === 0 && totalPaid === 0
        ? "Non défini"
        : balance <= 0
          ? "Payé"
          : totalPaid > 0
            ? "Partiel"
            : "En retard";

      return {
        id: student.id,
        studentId: student.id,
        studentName: student.nomEtudiant,
        studentNumAdmission: student.numAdmission,
        classe: student.classe,
        nomPere: student.nomPere,
        mobile: student.mobile,
        photoPath: student.photoPath,
        expected,
        paid: totalPaid,
        balance,
        status,
        lastPaymentDate: lastPayment?.datePaid || null,
        paymentMode: "Non spécifié",
        lastReceiptNumber: lastPayment?.receiptNumber || null,
        lastPaymentId: lastPayment?.id || null,
        lastPaymentAmount: lastPayment?.amount || 0,
        receivedFrom: lastPayment?.receivedFrom || null,
        purpose: lastPayment?.purpose || "Cotisation COGES",
      };
    });
  });
}

export async function searchStudents(query: string) {
  return protectedDbAction("Finance", "canView", async () => {
    if (!query || query.trim().length < 2) return [];
    const user = await getCurrentUser();
    const roleType = await getUserRoleType(user);
    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    const term = `%${query.trim()}%`;
    
    let conditions = [
      eq(students.schoolId, schoolId),
      or(
        ilike(students.nomEtudiant, term),
        ilike(students.numAdmission, term),
        ilike(students.nomPere, term)
      )
    ];
    
    if (roleType === "level_director" && activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      conditions.push(inArray(students.educationalLevel, compatibleLevels));
    }

    return await db
      .select({
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
        classe: students.classe,
        nomPere: students.nomPere,
        mobile: students.mobile,
      })
      .from(students)
      .where(and(...conditions))
      .limit(10);
  });
}
