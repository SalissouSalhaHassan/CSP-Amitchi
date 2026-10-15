import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, inArray } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import {
  schoolClasses,
  schoolSections,
  schoolSessions,
  studentResults
} from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { getUserRoleType, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (!action) {
    return mobileJsonError("Action manquante", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // Check general access (staff, director, level_director, admin)
  const hasAccess =
    [
      "admin",
      "super_admin",
      "director",
      "directeur",
      "general_director",
      "level_director",
      "staff",
      "censeur",
      "surveillant",
    ].includes(roleType) ||
    Boolean(user.superAdmin || user.admin) ||
    String(user.role?.roleName || user.role || "").toLowerCase().includes("admin") ||
    String(user.role?.roleName || user.role || "").toLowerCase().includes("direct") ||
    String(user.role?.roleName || user.role || "").toLowerCase().includes("staff");

  if (!hasAccess) {
    return mobileJsonError("Accès refusé. Privilèges administratifs requis.", 403);
  }

  try {
    if (action === "getStudentFormOptions") {
      const cond = schoolId ? eq(schoolSections.schoolId, schoolId) : undefined;
      const classCond = schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined;

      const sections = await readDb.query.schoolSections.findMany({ where: cond });
      const classes = await readDb.query.schoolClasses.findMany({ where: classCond });

      let filteredSections = sections;
      let filteredClasses = classes;

      const userLevel = user.educationalLevel;
      if (userLevel && !hasAllEducationalLevels(userLevel)) {
        filteredSections = sections.filter((s) =>
          isStudentInEducationalLevel(
            { educationalLevel: s.educationalLevel, sectionName: s.sectionName },
            userLevel
          )
        );
        filteredClasses = classes.filter((c) => {
          const matchedSection = sections.find((s) => s.id === c.sectionId);
          return isStudentInEducationalLevel(
            {
              educationalLevel: matchedSection?.educationalLevel,
              classe: c.className,
              sectionName: matchedSection?.sectionName,
            },
            userLevel
          );
        });
      }

      let levels = Array.from(
        new Set(
          filteredSections
            .map((s) => s.educationalLevel)
            .filter(Boolean)
        )
      ).sort();

      if (levels.length === 0 && userLevel && !hasAllEducationalLevels(userLevel)) {
        levels = [userLevel];
      }

      const sectionNames = Array.from(
        new Set(
          filteredSections
            .map((s) => s.sectionName)
            .filter(Boolean)
        )
      ).sort();

      const classNames = Array.from(
        new Set(
          filteredClasses
            .map((c) => c.className)
            .filter(Boolean)
        )
      ).sort();

      return NextResponse.json({
        success: true,
        levels,
        sections: sectionNames,
        classes: classNames,
      });
    }

    if (action === "getPromotionOptions") {
      const cond = schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined;
      const sessCond = schoolId ? eq(schoolSessions.schoolId, schoolId) : undefined;

      const classes = await readDb.query.schoolClasses.findMany({
        where: cond,
        orderBy: [schoolClasses.className]
      });

      const sessionsList = await readDb.query.schoolSessions.findMany({
        where: sessCond,
        orderBy: [
          sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
          sql`id DESC`
        ]
      });

      return NextResponse.json({
        success: true,
        classes: classes.map((c) => ({ id: c.id, class_name: c.className })),
        sessions: sessionsList.map((s) => ({
          id: s.id,
          session_name: s.sessionName,
          is_active: Boolean(s.isActive || s.status?.toLowerCase() === "actif"),
          status: s.status || (s.isActive ? "Actif" : "Inactif"),
        })),
      });
    }

    if (action === "getPromotionHistory") {
      const limit = Number(searchParams.get("limit") || "20");
      // Query activity_logs for student promotion
      try {
        const rows = await readDb.execute(sql`
          SELECT id, username, details, created_at, entity_id
          FROM activity_logs
          WHERE action_type = 'student_promotion' AND entity_type = 'promotion'
          ORDER BY created_at DESC
          LIMIT ${limit}
        `);

        return NextResponse.json({
          success: true,
          data: (rows as any) || []
        });
      } catch (err) {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    if (action === "getPromotionPreview") {
      // Return promotion average recommendation
      const studentIdsStr = searchParams.get("studentIds") || "";
      const studentIds = studentIdsStr.split(",").map(Number).filter(Boolean);

      if (studentIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const results = await readDb.query.studentResults.findMany({
        where: inArray(studentResults.studentId, studentIds),
      });

      const statsByStudent = new Map<number, number[]>();
      for (const row of results) {
        const studentId = row.studentId;
        if (!studentId) continue;

        const values = [
          row.totalScore,
          row.moyenneDevoirs,
          row.classWorkScore,
          row.weightedScore,
        ].filter((v): v is number => v !== null && v > 0);

        if (values.length > 0) {
          if (!statsByStudent.has(studentId)) {
            statsByStudent.set(studentId, []);
          }
          statsByStudent.get(studentId)!.push(values[0]);
        }
      }

      // We return recommendations
      const data = studentIds.map((id) => {
        const grades = statsByStudent.get(id) || [];
        const average = grades.length === 0 ? null : grades.reduce((a, b) => a + b, 0) / grades.length;
        
        let recommendation = "A verifier";
        if (average !== null) {
          if (average >= 10) recommendation = "Promouvoir";
          else if (average >= 8) recommendation = "Sous reserve";
          else recommendation = "Redoublement conseille";
        }

        return {
          id,
          calculated_average: average,
          recommendation,
        };
      });

      return NextResponse.json({ success: true, data });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
