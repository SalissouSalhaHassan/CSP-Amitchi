import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, readDb } from "@/infrastructure/database";
import { studentFees, feePayments } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // 1. GET FULL PAYMENTS JOURNAL (Journal de caisse)
  if (action === "getPaymentsJournal") {
    const targetSchoolId = Number(searchParams.get("schoolId"));
    const sessionId = searchParams.get("sessionId") ? Number(searchParams.get("sessionId")) : null;

    if (!targetSchoolId) {
      return mobileJsonError("schoolId manquant", 400);
    }

    if (schoolId && schoolId !== targetSchoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    try {
      const conditions: any[] = [
        eq(feePayments.schoolId, targetSchoolId),
      ];

      if (sessionId) {
        conditions.push(eq(studentFees.sessionId, sessionId));
      }

      if ((roleType === "parent" || roleType === "eleve") && user.studentId) {
        conditions.push(eq(studentFees.studentId, user.studentId));
      }

      let payments = await readDb
        .select({
          id: feePayments.id,
          school_id: feePayments.schoolId,
          fee_id: feePayments.feeId,
          amount: feePayments.amount,
          reduction: feePayments.reduction,
          date_paid: feePayments.datePaid,
          month_concerned: feePayments.monthConcerned,
          payment_mode: feePayments.paymentMode,
          reference: feePayments.reference,
          recorded_by: feePayments.recordedBy,
          student_id: studentFees.studentId,
          student_name: students.nomEtudiant,
          num_admission: students.numAdmission,
          classe: students.classe,
          educational_level: students.educationalLevel,
          fee_status: studentFees.status,
          total_expected: studentFees.totalExpected,
          balance: studentFees.balance,
        })
        .from(feePayments)
        .innerJoin(studentFees, eq(studentFees.id, feePayments.feeId))
        .leftJoin(students, eq(students.id, studentFees.studentId))
        .where(and(...conditions))
        .orderBy(desc(feePayments.datePaid), desc(feePayments.id));

      const activeLevel = user.educationalLevel;
      const isLevelScoped = Boolean(
        (activeLevel && !hasAllEducationalLevels(activeLevel)) ||
        roleType === "level_director" ||
        roleType === "level_comptable" ||
        roleType === "level_caissier"
      );

      if (isLevelScoped && activeLevel) {
        payments = payments.filter((p) =>
          isStudentInEducationalLevel(
            { educationalLevel: p.educational_level, classe: p.classe },
            activeLevel
          )
        );
      }

      const list = payments.map((p) => ({
        id: p.id,
        school_id: p.school_id,
        fee_id: p.fee_id,
        amount: Number(p.amount) || 0,
        reduction: Number(p.reduction) || 0,
        date_paid: p.date_paid?.toISOString() || null,
        month_concerned: p.month_concerned,
        payment_mode: p.payment_mode || "Espèces",
        reference: p.reference || `REC-${p.id}`,
        recorded_by: p.recorded_by || "Admin",
        student_id: p.student_id,
        student_name: p.student_name || "Élève",
        num_admission: p.num_admission || "-",
        classe: p.classe || "-",
        educational_level: p.educational_level || "",
        fee_status: p.fee_status || "Soldé",
        total_expected: Number(p.total_expected) || 0,
        balance: Number(p.balance) || 0,
      }));

      return NextResponse.json({ success: true, data: list });
    } catch (err: any) {
      console.error("[Payments Journal Error]:", err);
      return mobileJsonError(`Erreur: ${err.message || err}`, 500);
    }
  }

  // 2. GET FEE PAYMENTS BY SPECIFIC FEE ID
  if (action !== "getFeePayments") {
    return mobileJsonError("Action non supportée ou manquante", 400);
  }

  const feeId = Number(searchParams.get("feeId"));
  if (!feeId) {
    return mobileJsonError("feeId manquant", 400);
  }

  try {
    const fee = await readDb
      .select({
        schoolId: studentFees.schoolId,
        studentId: studentFees.studentId,
      })
      .from(studentFees)
      .where(eq(studentFees.id, feeId))
      .limit(1);

    if (fee.length === 0) {
      return mobileJsonError("Frais de scolarité introuvables", 404);
    }

    if (schoolId && fee[0].schoolId !== schoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    if ((roleType === "parent" || roleType === "eleve") && user.studentId !== fee[0].studentId) {
      return mobileJsonError("Accès refusé. Ce dossier ne vous appartient pas.", 403);
    }

    const payments = await readDb
      .select({
        id: feePayments.id,
        school_id: feePayments.schoolId,
        fee_id: feePayments.feeId,
        amount: feePayments.amount,
        reduction: feePayments.reduction,
        date_paid: feePayments.datePaid,
        month_concerned: feePayments.monthConcerned,
        payment_mode: feePayments.paymentMode,
        reference: feePayments.reference,
        recorded_by: feePayments.recordedBy,
      })
      .from(feePayments)
      .where(eq(feePayments.feeId, feeId))
      .orderBy(desc(feePayments.datePaid));

    const list = payments.map((p) => ({
      id: p.id,
      school_id: p.school_id,
      fee_id: p.fee_id,
      amount: p.amount,
      reduction: p.reduction,
      date_paid: p.date_paid?.toISOString() || null,
      month_concerned: p.month_concerned,
      payment_mode: p.payment_mode,
      reference: p.reference,
      recorded_by: p.recorded_by,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    console.error("[Payments GET Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // Allow all administrative, owner, and financial roles
  const userAny = user as any;
  const hasAccess = [
    "admin",
    "super_admin",
    "owner",
    "promoteur",
    "fondateur",
    "ministere",
    "director",
    "directeur",
    "general_director",
    "level_director",
    "level_comptable",
    "level_caissier",
    "comptable",
    "caissier",
    "staff",
  ].includes(roleType) ||
    Boolean(userAny.permissions?.includes("finance.collect")) ||
    Boolean(userAny.permissions?.includes("finance.view"));

  if (!hasAccess) {
    return mobileJsonError("Accès refusé. Seuls les administrateurs et comptables peuvent enregistrer des paiements.", 403);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== "recordPayment" || !payload) {
      return mobileJsonError("Action non supportée ou payload manquant", 400);
    }

    const {
      feeId,
      schoolId: targetSchoolId,
      amount,
      reduction,
      paymentMode,
      reference,
      monthConcerned,
      recordedBy,
      currentPaid,
      currentReduction,
      totalExpected,
    } = payload;

    if (!feeId || !targetSchoolId) {
      return mobileJsonError("Paramètres manquants dans le payload", 400);
    }

    const isSuperOrOwner = ["super_admin", "owner", "promoteur", "fondateur", "ministere"].includes(roleType);
    if (!isSuperOrOwner && schoolId && targetSchoolId && Number(schoolId) !== Number(targetSchoolId)) {
      return mobileJsonError("Accès refusé. Vous n'avez pas accès à cet établissement.", 403);
    }

    const cleanRef = reference ? String(reference).trim() : null;

    // Idempotency: if payment with this reference was already recorded, return success cleanly
    if (cleanRef) {
      const existingPayment = await readDb.query.feePayments.findFirst({
        where: and(
          eq(feePayments.feeId, Number(feeId)),
          eq(feePayments.reference, cleanRef)
        )
      });
      if (existingPayment) {
        return NextResponse.json({
          success: true,
          payment: {
            id: existingPayment.id,
            school_id: existingPayment.schoolId,
            fee_id: existingPayment.feeId,
            amount: existingPayment.amount,
            reduction: existingPayment.reduction,
            date_paid: existingPayment.datePaid?.toISOString() || null,
            month_concerned: existingPayment.monthConcerned,
            payment_mode: existingPayment.paymentMode,
            reference: existingPayment.reference,
            recorded_by: existingPayment.recordedBy,
          },
          alreadyRecorded: true,
        });
      }
    }

    // Query current fee from DB to accurately accumulate multiple payments in a batch
    const currentFee = await readDb.query.studentFees.findFirst({
      where: eq(studentFees.id, Number(feeId))
    });

    const doubleAmount = Number(amount || 0);
    const doubleReduction = Number(reduction || 0);

    const feePaid = currentFee ? Number(currentFee.totalPaid || 0) : Number(currentPaid || 0);
    const feeReduction = currentFee ? Number(currentFee.totalReduction || 0) : Number(currentReduction || 0);
    const feeExpected = currentFee ? Number(currentFee.totalExpected || 0) : Number(totalExpected || 0);

    const newPaid = feePaid + doubleAmount;
    const newReduction = feeReduction + doubleReduction;
    const newBalance = feeExpected - newPaid - newReduction;

    let newStatus = "Impayé";
    if (newBalance <= 0) {
      newStatus = "Soldé";
    } else if (newPaid > 0) {
      newStatus = "Partiel";
    }

    // Insert payment
    const paymentValues = {
      schoolId: Number(targetSchoolId),
      feeId: Number(feeId),
      amount: doubleAmount,
      reduction: doubleReduction,
      paymentMode: paymentMode || "Espèces",
      reference: cleanRef,
      monthConcerned: monthConcerned || null,
      recordedBy: recordedBy || user.utilisateur || "Mobile App",
      datePaid: new Date(),
    };

    const [insertedPayment] = await db.insert(feePayments).values(paymentValues).returning();

    // Update student fee record
    await db
      .update(studentFees)
      .set({
        totalPaid: newPaid,
        totalReduction: newReduction,
        balance: newBalance,
        status: newStatus,
      })
      .where(eq(studentFees.id, Number(feeId)));

    try {
      revalidatePath("/dashboard/finance");
      revalidatePath("/dashboard/finance/invoices");
    } catch (_) {}

    return NextResponse.json({
      success: true,
      payment: insertedPayment
        ? {
            id: insertedPayment.id,
            school_id: insertedPayment.schoolId,
            fee_id: insertedPayment.feeId,
            amount: insertedPayment.amount,
            reduction: insertedPayment.reduction,
            date_paid: insertedPayment.datePaid?.toISOString() || null,
            month_concerned: insertedPayment.monthConcerned,
            payment_mode: insertedPayment.paymentMode,
            reference: insertedPayment.reference,
            recorded_by: insertedPayment.recordedBy,
          }
        : null,
      newPaid,
      newReduction,
      newBalance,
      newStatus,
    });
  } catch (err: any) {
    console.error("[Payments POST Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
