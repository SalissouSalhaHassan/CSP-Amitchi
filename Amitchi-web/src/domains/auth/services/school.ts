import { headers, cookies } from "next/headers";
import { db, readDb } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { eq, or, ilike } from "drizzle-orm";
import { cache } from "react";
import { getCurrentUser } from "./session";
import { cache as redisCache } from "@/lib/redis";

/**
 * Gets the current school information based on the subdomain slug
 * injected by the middleware in 'x-school-slug' header.
 * Fallback to user's school if no slug is present (e.g., main domain login).
 */
export const getCurrentSchool = cache(async () => {
  const headerList = await headers();
  let slug = headerList.get("x-school-slug");

  // Fallback: extract subdomain slug directly from host header if missing
  if (!slug) {
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    if (host && host.includes(".edut.pro")) {
      const mainDomainPart = host.split(".edut.pro")[0];
      const parts = mainDomainPart.split(".");
      const candidateSlug = parts[parts.length - 1];
      if (candidateSlug && candidateSlug !== "www" && candidateSlug !== "app") {
        slug = candidateSlug;
      }
    }
  }

  // 0. Check for Impersonation (Super Admin only)
  const user = await getCurrentUser();
  if (user?.superAdmin) {
    const cookieStore = await cookies();
    const impersonatedId = cookieStore.get("impersonated_school_id")?.value;
    if (impersonatedId) {
      const school = await readDb.query.schools.findFirst({
        where: eq(schools.id, parseInt(impersonatedId)),
      });
      if (school) return school;
    }
  }

  // 1. If we have a slug from subdomain, use it (Primary SaaS path)
  if (slug) {
    // Try Redis Cache first
    const cacheKey = `school_config:${slug}`;
    const cachedSchool = await redisCache.get<any>(cacheKey);
    if (cachedSchool) {
      console.log(`🚀 [Redis Hit] School config for ${slug}`);
      return cachedSchool;
    }

    try {
      const cleanSlug = slug.toLowerCase().trim();
      const host = headerList.get("x-school-host") || headerList.get("x-forwarded-host") || headerList.get("host") || "";
      const cleanHost = host.toLowerCase().trim();

      const conditions = [
        eq(schools.slug, cleanSlug),
        ilike(schools.slug, cleanSlug),
      ];
      if (cleanHost) {
        conditions.push(eq(schools.customDomain, cleanHost));
        conditions.push(ilike(schools.customDomain, `%${cleanHost}%`));
      }
      if (cleanSlug && cleanSlug !== "edut" && cleanSlug !== "main") {
        conditions.push(ilike(schools.customDomain, `%${cleanSlug}%`));
        conditions.push(ilike(schools.name, `%${cleanSlug.replace(/-/g, " ")}%`));
      }

      const school = await readDb.query.schools.findFirst({
        where: or(...conditions),
      });
      if (school) {
        // Cache for 1 hour
        await redisCache.set(cacheKey, school, 3600);
        return school;
      }
    } catch (error) {
      console.error("[getCurrentSchool] Error fetching school by slug:", error);
    }
  }

  // 2. Fallback: Check the logged-in user's school
  try {
    const user = await getCurrentUser();
    if (user && user.schoolId) {
      const school = await db.query.schools.findFirst({
        where: eq(schools.id, user.schoolId),
      });
      if (school) return school;
    }
  } catch (error) {
    console.error("[getCurrentSchool] Error fetching school by user context:", error);
  }

  return null;
});

import { schoolBranches } from "@/infrastructure/database/schema/settings";

// Helper to normalize educational level strings
function localNormalizeLevel(level: string): string {
  return level
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Gets the active branch data and all branches of the school based on the user's role and cookies.
 */
export const getActiveBranchData = cache(async (user: any) => {
  if (!user || !user.schoolId) return { branchData: null, allBranches: [] };

  try {
    const allBranches = await readDb.query.schoolBranches.findMany({
      where: eq(schoolBranches.schoolId, user.schoolId),
      orderBy: [schoolBranches.createdAt]
    });

    let branchData = null;
    const isAdmin = user.admin === true || user.superAdmin === true || user.superAdmin === 1;

    if (isAdmin) {
      const cookieStore = await cookies();
      const selectedBranchId = cookieStore.get("selected_branch_id")?.value;
      if (selectedBranchId && selectedBranchId !== "all" && !isNaN(parseInt(selectedBranchId))) {
        branchData = allBranches.find(b => b.id.toString() === selectedBranchId) || null;
      } else {
        branchData = null; // represents General Administration / All Branches
      }
    } else {
      if (user.educationalLevel) {
        const normalizedUserLevel = localNormalizeLevel(user.educationalLevel);
        branchData = allBranches.find(
          b => b.instType && localNormalizeLevel(b.instType) === normalizedUserLevel
        ) || null;
      }

      if (!branchData && allBranches.length > 0) {
        branchData = allBranches[0];
      }
    }

    return { branchData, allBranches };
  } catch (e) {
    console.error("❌ Failed to fetch active branch data:", e);
    return { branchData: null, allBranches: [] };
  }
});

/**
 * Helper to get only the current school ID.
 * Returns 1 if not in a school context.
 */
export async function getActiveSchoolId() {
  const school = await getCurrentSchool();
  if (school?.id) return school.id;

  const user = await getCurrentUser();
  if (user?.schoolId) {
    return user.schoolId;
  }

  try {
    const aiiuSchool = await readDb.query.schools.findFirst({
      where: or(
        eq(schools.slug, "group-aiiu-niger"),
        ilike(schools.slug, "%aiiu%")
      )
    });
    if (aiiuSchool?.id) return aiiuSchool.id;
  } catch (_) {}

  return 9;
}

