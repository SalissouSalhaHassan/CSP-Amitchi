import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, inArray } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType, getCompatibleLevels, normalizeLevel, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (!action) {
    return mobileJsonError("Action manquante", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    if (action === "getFinanceStats") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      const sessionId = Number(searchParams.get("sessionId"));

      if (!targetSchoolId || !sessionId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      if (roleType === "teacher" || roleType === "enseignant") {
        return NextResponse.json({
          success: true,
          stats: {
            totalExpected: 0.0,
            totalCollected: 0.0,
            totalDebts: 0.0,
          },
        });
      }

      const conditions: any[] = [
        eq(studentFees.schoolId, targetSchoolId),
        eq(studentFees.sessionId, sessionId),
      ];

      if ((roleType === "parent" || roleType === "eleve") && user.studentId) {
        conditions.push(eq(studentFees.studentId, user.studentId));
      }

      const activeLevel = user.educationalLevel;
      const isLevelScoped = Boolean(
        (activeLevel && !hasAllEducationalLevels(activeLevel)) ||
        roleType === "level_director" ||
        roleType === "level_comptable" ||
        roleType === "level_caissier"
      );

      let statsResult: { totalExpected: number; totalCollected: number; totalDebts: number };

      if (isLevelScoped && activeLevel) {
        const rows = await readDb
          .select({
            totalExpected: studentFees.totalExpected,
            totalPaid: studentFees.totalPaid,
            balance: studentFees.balance,
            educationalLevel: students.educationalLevel,
            classe: students.classe,
          })
          .from(studentFees)
          .leftJoin(students, eq(students.id, studentFees.studentId))
          .where(and(...conditions));

        const filtered = rows.filter((r) =>
          isStudentInEducationalLevel(
            { educationalLevel: r.educationalLevel, classe: r.classe },
            activeLevel
          )
        );

        let totalExpected = 0.0;
        let totalCollected = 0.0;
        let totalDebts = 0.0;

        for (const row of filtered) {
          totalExpected += Number(row.totalExpected) || 0;
          totalCollected += Number(row.totalPaid) || 0;
          totalDebts += Number(row.balance) || 0;
        }

        statsResult = { totalExpected, totalCollected, totalDebts };
      } else {
        // High performance SQL Aggregation in PostgreSQL
        const [agg] = await readDb
          .select({
            totalExpected: sql<number>`COALESCE(SUM(${studentFees.totalExpected}), 0)`,
            totalCollected: sql<number>`COALESCE(SUM(${studentFees.totalPaid}), 0)`,
            totalDebts: sql<number>`COALESCE(SUM(${studentFees.balance}), 0)`,
          })
          .from(studentFees)
          .where(and(...conditions));

        statsResult = {
          totalExpected: Number(agg?.totalExpected) || 0,
          totalCollected: Number(agg?.totalCollected) || 0,
          totalDebts: Number(agg?.totalDebts) || 0,
        };
      }

      return NextResponse.json({
        success: true,
        stats: statsResult,
      });
    }

    if (action === "getSessions") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      if (!targetSchoolId) {
        return mobileJsonError("schoolId manquant", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      const rows = await readDb
        .select({
          id: schoolSessions.id,
          session_name: schoolSessions.sessionName,
          is_active: schoolSessions.isActive,
          status: schoolSessions.status,
          school_id: schoolSessions.schoolId,
        })
        .from(schoolSessions)
        .where(eq(schoolSessions.schoolId, targetSchoolId))
        .orderBy(
          sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
          sql`id DESC`
        );

      const list = rows.map((s) => ({
        id: s.id,
        session_name: s.session_name,
        is_active: Boolean(s.is_active || s.status?.toLowerCase() === "actif"),
        status: s.status || (s.is_active ? "Actif" : "Inactif"),
        school_id: s.school_id,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    console.error("[Summary GET Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
