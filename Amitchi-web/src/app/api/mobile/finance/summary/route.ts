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
      const targetSchoolId = Number(searchParams.get("schoolId")) || schoolId;
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
            section: students.section,
          })
          .from(studentFees)
          .leftJoin(students, eq(studentFees.studentId, students.id))
          .where(and(...conditions));

        const filtered = rows.filter((r) =>
          isStudentInEducationalLevel(
            {
              educationalLevel: r.educationalLevel,
              classe: r.classe,
              sectionName: r.section,
            },
            activeLevel
          )
        );

        let totalExp = 0;
        let totalCol = 0;
        let totalDebt = 0;

        for (const row of filtered) {
          totalExp += Number(row.totalExpected) || 0;
          totalCol += Number(row.totalPaid) || 0;
          totalDebt += Number(row.balance) || 0;
        }

        statsResult = {
          totalExpected: totalExp,
          totalCollected: totalCol,
          totalDebts: totalDebt,
        };
      } else {
        const result = await readDb
          .select({
            totalExpected: sql<number>`COALESCE(SUM(${studentFees.totalExpected}), 0)::numeric`,
            totalCollected: sql<number>`COALESCE(SUM(${studentFees.totalPaid}), 0)::numeric`,
            totalDebts: sql<number>`COALESCE(SUM(${studentFees.balance}), 0)::numeric`,
          })
          .from(studentFees)
          .where(and(...conditions));

        statsResult = {
          totalExpected: Number(result[0]?.totalExpected) || 0.0,
          totalCollected: Number(result[0]?.totalCollected) || 0.0,
          totalDebts: Number(result[0]?.totalDebts) || 0.0,
        };
      }

      return NextResponse.json({
        success: true,
        stats: statsResult,
      });
    }

    if (action === "getSessions") {
      const rawSchoolId = Number(searchParams.get("schoolId"));
      const targetSchoolId = rawSchoolId || schoolId || 1;

      let rows = await readDb
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

      // Intelligent Fallback: if school has no sessions explicitly assigned yet, inherit active session
      if (rows.length === 0) {
        rows = await readDb
          .select({
            id: schoolSessions.id,
            session_name: schoolSessions.sessionName,
            is_active: schoolSessions.isActive,
            status: schoolSessions.status,
            school_id: schoolSessions.schoolId,
          })
          .from(schoolSessions)
          .orderBy(
            sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
            sql`id DESC`
          );
      }

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
