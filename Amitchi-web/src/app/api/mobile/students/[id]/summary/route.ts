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
      const sessCond = schoolId ? eq(schoolSessions.schoolId, schoolId) : undefined;

      const sections = await readDb.query.schoolSections.findMany({ where: cond });
      const classes = await readDb.query.schoolClasses.findMany({ where: classCond });
      
      let sessionsList = await readDb.query.schoolSessions.findMany({
        where: sessCond,
        orderBy: [
          sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
          sql`id DESC`
        ]
      });

      if (sessionsList.length === 0) {
        sessionsList = await readDb.query.schoolSessions.findMany({
          orderBy: [
            sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
            sql`id DESC`
          ]
        });
      }

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

      const sessionNames = Array.from(
        new Set(
          sessionsList
            .map((s) => s.sessionName)
            .filter(Boolean)
        )
      );

      return NextResponse.json({
        success: true,
        levels,
        sections: sectionNames,
        classes: classNames,
        sessions: sessionNames.length > 0 ? sessionNames : ["2026-2027"],
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
      return NextResponse.json({
        success: true,
        history: [],
      });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    console.error("[Summary API Error]:", err);
    return mobileJsonError(`Erreur serveur: ${err.message || err}`, 500);
  }
}
