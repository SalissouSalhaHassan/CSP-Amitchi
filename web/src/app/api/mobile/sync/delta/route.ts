import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt, inArray, isNotNull, or } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { studentResults } from "@/infrastructure/database/schema/academics";
import { feePayments, expenses } from "@/infrastructure/database/schema/finance";

export const dynamic = "force-dynamic";

interface DeltaSyncRequest {
  schoolId?: number;
  lastSyncTimestamp?: string;
  entities?: string[];
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  if (!user.schoolId) {
    return mobileJsonError("Utilisateur non rattaché à un établissement.", 403);
  }

  const schoolId = user.schoolId;

  try {
    const body: DeltaSyncRequest = await request.json().catch(() => ({}));
    const lastSyncDate = body.lastSyncTimestamp ? new Date(body.lastSyncTimestamp) : null;
    const requestedEntities = Array.isArray(body.entities) && body.entities.length > 0
      ? body.entities
      : ["students", "attendance", "grades", "fee_payments"];

    const changes: Record<string, any[]> = {};
    const deletedIds: Record<string, number[]> = {};

    // 1. Students Delta
    if (requestedEntities.includes("students")) {
      const studentCond = [eq(students.schoolId, schoolId)];
      if (lastSyncDate && !isNaN(lastSyncDate.getTime())) {
        studentCond.push(gt(students.updatedAt, lastSyncDate));
      }

      const updatedStudents = await readDb.query.students.findMany({
        where: and(...studentCond),
        columns: {
          id: true,
          schoolId: true,
          numAdmission: true,
          nomEtudiant: true,
          nomArabe: true,
          photoPath: true,
          educationalLevel: true,
          classe: true,
          classId: true,
          section: true,
          session: true,
          sexe: true,
          statut: true,
          mobile: true,
          whatsapp: true,
          nomPere: true,
          fraisMensuels: true,
          fraisInscription: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: [students.nomEtudiant],
      });

      const activeStudents: any[] = updatedStudents;
      const deletedStudentIds: number[] = [];

      changes["students"] = activeStudents;
      deletedIds["students"] = deletedStudentIds;
    }

    // 2. Attendance Delta
    if (requestedEntities.includes("attendance")) {
      const attCond = [eq(studentAttendance.schoolId, schoolId)];
      if (lastSyncDate && !isNaN(lastSyncDate.getTime())) {
        attCond.push(gt(studentAttendance.updatedAt, lastSyncDate));
      }

      const updatedAttendance = await readDb.query.studentAttendance.findMany({
        where: and(...attCond),
        columns: {
          id: true,
          schoolId: true,
          studentId: true,
          classId: true,
          subjectId: true,
          employeeId: true,
          date: true,
          status: true,
          remark: true,
          recordedBy: true,
          deletedAt: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      const activeAttendance: any[] = [];
      const deletedAttIds: number[] = [];

      for (const a of updatedAttendance) {
        if (a.deletedAt) {
          deletedAttIds.push(a.id);
        } else {
          activeAttendance.push(a);
        }
      }

      changes["attendance"] = activeAttendance;
      deletedIds["attendance"] = deletedAttIds;
    }

    // 3. Grades / Student Results Delta
    if (requestedEntities.includes("grades") || requestedEntities.includes("student_results")) {
      const gradesCond = [];
      if (lastSyncDate && !isNaN(lastSyncDate.getTime())) {
        gradesCond.push(gt(studentResults.updatedAt, lastSyncDate));
      }

      const updatedResults = await readDb.query.studentResults.findMany({
        where: gradesCond.length > 0 ? and(...gradesCond) : undefined,
        with: {
          student: {
            columns: { schoolId: true },
          },
        },
      });

      const activeGrades: any[] = [];
      const deletedGradeIds: number[] = [];

      for (const g of updatedResults) {
        // Enforce school isolation via joined student
        if (g.student?.schoolId === schoolId) {
          const { student, ...gradeData } = g as any;
          if (g.deletedAt) {
            deletedGradeIds.push(g.id);
          } else {
            activeGrades.push(gradeData);
          }
        }
      }

      changes["grades"] = activeGrades;
      deletedIds["grades"] = deletedGradeIds;
    }

    // 4. Fee Payments Delta
    if (requestedEntities.includes("fee_payments") || requestedEntities.includes("fees")) {
      const feeCond = [eq(feePayments.schoolId, schoolId)];
      if (lastSyncDate && !isNaN(lastSyncDate.getTime())) {
        feeCond.push(gt(feePayments.updatedAt, lastSyncDate));
      }

      const updatedPayments = await readDb.query.feePayments.findMany({
        where: and(...feeCond),
        columns: {
          id: true,
          schoolId: true,
          feeId: true,
          amount: true,
          reduction: true,
          datePaid: true,
          monthConcerned: true,
          paymentMode: true,
          reference: true,
          receiptToken: true,
          recordedBy: true,
          deletedAt: true,
          updatedAt: true,
          createdAt: true,
        },
      });

      const activePayments: any[] = [];
      const deletedPaymentIds: number[] = [];

      for (const p of updatedPayments) {
        if (p.deletedAt) {
          deletedPaymentIds.push(p.id);
        } else {
          activePayments.push(p);
        }
      }

      changes["fee_payments"] = activePayments;
      deletedIds["fee_payments"] = deletedPaymentIds;
    }

    // 5. Expenses Delta
    if (requestedEntities.includes("expenses")) {
      const expCond = [eq(expenses.schoolId, schoolId)];
      if (lastSyncDate && !isNaN(lastSyncDate.getTime())) {
        expCond.push(gt(expenses.createdAt, lastSyncDate));
      }

      const updatedExpenses = await readDb.query.expenses.findMany({
        where: and(...expCond),
        with: {
          category: true,
        },
        orderBy: [expenses.dateExpense],
      });

      const activeExpenses: any[] = updatedExpenses.map((e) => ({
        id: e.id,
        school_id: e.schoolId,
        reference: e.reference,
        category: e.category?.name || "Général",
        description: e.description || e.category?.name || "Dépense",
        amount: Number(e.amount) || 0,
        date_expense: e.dateExpense ? new Date(e.dateExpense).toISOString() : new Date().toISOString(),
        payment_mode: e.paymentMode || "Espèces",
        status: e.status || "Payé",
        recorded_by: e.recordedBy || "Admin",
      }));

      changes["expenses"] = activeExpenses;
      deletedIds["expenses"] = [];
    }

    return NextResponse.json({
      success: true,
      serverTimestamp: new Date().toISOString(),
      schoolId,
      changes,
      deletedIds,
    });
  } catch (err: any) {
    console.error("Delta Sync Server Error:", err);
    return mobileJsonError(`Erreur lors de la synchronisation différentielle: ${err?.message || err}`, 500);
  }
}
