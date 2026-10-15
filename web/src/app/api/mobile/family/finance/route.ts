import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, inArray } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { studentFees, feePayments } from "@/infrastructure/database/schema/finance";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    // 1. Fetch fees
    const feesList = await readDb.query.studentFees.findMany({
      where: eq(studentFees.studentId, studentId),
      orderBy: [sql`session_id DESC`]
    });

    const feesMapped = feesList.map((f) => ({
      id: f.id,
      school_id: f.schoolId,
      student_id: f.studentId,
      session_id: f.sessionId,
      total_expected: f.totalExpected,
      total_paid: f.totalPaid,
      total_reduction: f.totalReduction,
      balance: f.balance,
      status: f.status,
    }));

    // 2. Fetch payments if fees exist
    let paymentsMapped: any[] = [];
    if (feesList.length > 0) {
      const feeIds = feesList.map((f) => f.id);
      const payments = await readDb.query.feePayments.findMany({
        where: inArray(feePayments.feeId, feeIds),
        orderBy: [sql`date_paid DESC`]
      });

      paymentsMapped = payments.map((p) => ({
        id: p.id,
        school_id: p.schoolId,
        fee_id: p.feeId,
        amount: p.amount,
        reduction: p.reduction,
        date_paid: p.datePaid?.toISOString() || null,
        month_concerned: p.monthConcerned,
        payment_mode: p.paymentMode,
        reference: p.reference,
        recorded_by: p.recordedBy,
      }));
    }

    // 3. Calculate summary
    let totalExpected = 0.0;
    let totalPaid = 0.0;
    let totalReduction = 0.0;
    let totalBalance = 0.0;

    for (const f of feesList) {
      totalExpected += f.totalExpected || 0.0;
      totalPaid += f.totalPaid || 0.0;
      totalReduction += f.totalReduction || 0.0;
      totalBalance += f.balance || 0.0;
    }

    return NextResponse.json({
      success: true,
      fees: feesMapped,
      payments: paymentsMapped,
      summary: {
        totalExpected,
        totalPaid,
        totalReduction,
        totalBalance,
      }
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
