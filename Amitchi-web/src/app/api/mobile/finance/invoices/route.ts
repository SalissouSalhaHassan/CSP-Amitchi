import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentFees, feePayments } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType, getCompatibleLevels, normalizeLevel, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action !== "getStudentFeesList") {
    return mobileJsonError("Action non supportée ou manquante", 400);
  }

  const targetSchoolId = Number(searchParams.get("schoolId"));
  const sessionId = Number(searchParams.get("sessionId"));

  if (!targetSchoolId || !sessionId) {
    return mobileJsonError("Paramètres manquants", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  if (schoolId && schoolId !== targetSchoolId) {
    return mobileJsonError("Accès refusé", 403);
  }

  try {
    // Role-based restrictions
    if (roleType === "teacher" || roleType === "enseignant") {
      return NextResponse.json({ success: true, data: [] });
    }

    const conditions: any[] = [
      eq(studentFees.schoolId, targetSchoolId),
      eq(studentFees.sessionId, sessionId),
    ];

    if ((roleType === "parent" || roleType === "eleve") && user.studentId) {
      conditions.push(eq(studentFees.studentId, user.studentId));
    }

    // High-performance direct SQL JOIN query with selected columns
    let query = readDb
      .select({
        id: studentFees.id,
        school_id: studentFees.schoolId,
        student_id: studentFees.studentId,
        session_id: studentFees.sessionId,
        total_expected: studentFees.totalExpected,
        total_paid: studentFees.totalPaid,
        total_reduction: studentFees.totalReduction,
        balance: studentFees.balance,
        status: studentFees.status,
        num_admission: students.numAdmission,
        nom_etudiant: students.nomEtudiant,
        photo_path: students.photoPath,
        classe: students.classe,
        educational_level: students.educationalLevel,
      })
      .from(studentFees)
      .leftJoin(students, eq(students.id, studentFees.studentId))
      .where(and(...conditions))
      .orderBy(desc(studentFees.id));

    let rows = await query;

    // Fast Level Scoping if applicable
    const activeLevel = user.educationalLevel;
    const isLevelScoped = Boolean(
      (activeLevel && !hasAllEducationalLevels(activeLevel)) ||
      roleType === "level_director" ||
      roleType === "level_comptable" ||
      roleType === "level_caissier"
    );

    if (isLevelScoped && activeLevel) {
      rows = rows.filter((r) =>
        isStudentInEducationalLevel(
          { educationalLevel: r.educational_level, classe: r.classe },
          activeLevel
        )
      );
    }

    // Fast deduplication map
    const dedupedMap = new Map<number, typeof rows[0]>();
    for (const r of rows) {
      if (!r.student_id) continue;
      const existing = dedupedMap.get(r.student_id);
      if (!existing || (r.total_paid || 0) > (existing.total_paid || 0)) {
        dedupedMap.set(r.student_id, r);
      }
    }

    const list = Array.from(dedupedMap.values()).map((row) => {
      const expected = Number(row.total_expected) || 0;
      const paid = Number(row.total_paid) || 0;
      const reduction = Number(row.total_reduction) || 0;
      const balance = Math.max(0, expected - paid - reduction);
      const status = balance <= 0 ? "Soldé" : paid > 0 ? "Partiel" : "Impayé";

      return {
        id: row.id,
        school_id: row.school_id,
        student_id: row.student_id,
        session_id: row.session_id,
        total_expected: expected,
        total_paid: paid,
        total_reduction: reduction,
        balance,
        status,
        students: {
          num_admission: row.num_admission,
          nom_etudiant: row.nom_etudiant,
          photo_path: row.photo_path,
          classe: row.classe,
          educational_level: row.educational_level,
        },
      };
    });

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    console.error("[Invoices GET Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  const hasAccess = [
    "admin",
    "super_admin",
    "director",
    "directeur",
    "general_director",
    "level_director",
    "level_comptable",
    "level_caissier",
    "comptable",
    "caissier",
    "staff",
  ].includes(roleType);

  if (!hasAccess) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== "syncStudentFees" || !payload) {
      return mobileJsonError("Action non supportée ou payload manquant", 400);
    }

    const { schoolId: targetSchoolId, sessionId } = payload;
    if (!targetSchoolId || !sessionId) {
      return mobileJsonError("schoolId ou sessionId manquants", 400);
    }

    if (schoolId && schoolId !== targetSchoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    // Fast bulk sync of student fees
    const activeStudents = await readDb
      .select({
        id: students.id,
        fraisMensuels: students.fraisMensuels,
        ancienSolde: students.ancienSolde,
        fraisInscription: students.fraisInscription,
      })
      .from(students)
      .where(and(eq(students.schoolId, targetSchoolId), eq(students.statut, "Actif")));

    if (activeStudents.length > 0) {
      const existing = await readDb
        .select({ studentId: studentFees.studentId })
        .from(studentFees)
        .where(and(eq(studentFees.schoolId, targetSchoolId), eq(studentFees.sessionId, sessionId)));

      const existingIds = new Set(existing.map((f) => f.studentId));
      const missing = activeStudents.filter((s) => !existingIds.has(s.id));

      if (missing.length > 0) {
        const insertBatch = missing.map((s) => {
          const monthly = Number(s.fraisMensuels || 0);
          const inscr = Number(s.fraisInscription || 0);
          const oldBal = Number(s.ancienSolde || 0);
          const expected = inscr + oldBal + monthly;
          return {
            schoolId: targetSchoolId,
            studentId: s.id,
            sessionId,
            totalExpected: expected,
            totalPaid: 0.0,
            totalReduction: 0.0,
            balance: expected,
            status: "Impayé",
          };
        });

        // Batch insert in chunks of 100
        for (let i = 0; i < insertBatch.length; i += 100) {
          const chunk = insertBatch.slice(i, i + 100);
          await db.insert(studentFees).values(chunk).catch(() => {});
        }
      }
    }

    // Reconcile and recalculate actual totalPaid and balance from feePayments
    const sessionFees = await readDb
      .select({ id: studentFees.id, totalExpected: studentFees.totalExpected, totalPaid: studentFees.totalPaid })
      .from(studentFees)
      .where(and(eq(studentFees.schoolId, targetSchoolId), eq(studentFees.sessionId, sessionId)));

    const feeIds = sessionFees.map((f) => f.id);
    let updatedCount = 0;

    if (feeIds.length > 0) {
      // Process in chunks of 200 for inArray safety
      for (let i = 0; i < feeIds.length; i += 200) {
        const chunkIds = feeIds.slice(i, i + 200);
        const paymentSums = await readDb
          .select({
            feeId: feePayments.feeId,
            totalPaid: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)`,
            totalReduction: sql<number>`COALESCE(SUM(${feePayments.reduction}), 0)`,
          })
          .from(feePayments)
          .where(inArray(feePayments.feeId, chunkIds))
          .groupBy(feePayments.feeId);

        const paymentMap = new Map(paymentSums.map((p) => [p.feeId, p]));

        for (const fId of chunkIds) {
          const fee = sessionFees.find((sf) => sf.id === fId);
          if (!fee) continue;
          const pInfo = paymentMap.get(fee.id);
          const actualPaid = Number(pInfo?.totalPaid || 0);
          const actualReduction = Number(pInfo?.totalReduction || 0);
          const expected = Number(fee.totalExpected || 0);
          const balance = Math.max(0, expected - actualPaid - actualReduction);
          const status = balance <= 0 && expected > 0 ? "Soldé" : actualPaid > 0 ? "Partiel" : "Impayé";

          if (Number(fee.totalPaid || 0) !== actualPaid) {
            await db
              .update(studentFees)
              .set({
                totalPaid: actualPaid,
                totalReduction: actualReduction,
                balance,
                status,
              })
              .where(eq(studentFees.id, fee.id));
            updatedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      message: `Synchronisation terminée avec succès (${updatedCount} dossier(s) synchronisé(s)).`,
    });
  } catch (err: any) {
    console.error("[Invoices POST Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
