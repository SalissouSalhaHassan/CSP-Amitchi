"use server";

import { headers } from "next/headers";
import { readDb } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { eq, or, ilike } from "drizzle-orm";
import { cache as redisCache } from "@/lib/redis";

export async function getSchoolBranding() {
  try {
    const headerList = await headers();
    let slug = headerList.get("x-school-slug");
    const host =
      headerList.get("x-school-host") ||
      headerList.get("x-forwarded-host") ||
      headerList.get("host") ||
      "";

    // Subdomain extraction fallback from host if x-school-slug header was not present
    if (!slug && host && host.includes(".edut.pro")) {
      const mainDomainPart = host.split(".edut.pro")[0];
      const parts = mainDomainPart.split(".");
      const candidateSlug = parts[parts.length - 1];
      if (candidateSlug && candidateSlug !== "www" && candidateSlug !== "app") {
        slug = candidateSlug;
      }
    }

    const cleanSlug = slug?.toLowerCase().trim() || "";
    const cleanHost = host.toLowerCase().trim() || "";

    // If we have a tenant slug or host, search strictly for that school
    if (cleanSlug || cleanHost) {
      const cacheKey = `school_branding_v2:${cleanSlug || cleanHost}`;
      const cached = await redisCache.get<any>(cacheKey);
      if (cached) return cached;

      const conditions = [];
      if (cleanSlug) {
        conditions.push(eq(schools.slug, cleanSlug));
        conditions.push(ilike(schools.slug, cleanSlug));
      }
      if (cleanHost) {
        conditions.push(eq(schools.customDomain, cleanHost));
        conditions.push(ilike(schools.customDomain, `%${cleanHost}%`));
      }
      if (cleanSlug && cleanSlug !== "edut" && cleanSlug !== "main") {
        conditions.push(ilike(schools.customDomain, `%${cleanSlug}%`));
        conditions.push(ilike(schools.name, `%${cleanSlug.replace(/-/g, " ")}%`));
      }

      if (conditions.length > 0) {
        const school = await readDb.query.schools.findFirst({
          where: or(...conditions),
          columns: {
            id: true,
            name: true,
            logoPath: true,
            slug: true,
          },
        });

        if (school) {
          let logo = school.logoPath || null;
          // If no school-level logo, only check branches strictly belonging to THIS school
          if (!logo && school.id) {
            const branch = await readDb.query.schoolBranches.findFirst({
              where: eq(schoolBranches.schoolId, school.id),
            });
            logo = branch?.logoPath || null;
          }

          const result = {
            id: school.id,
            name: school.name,
            logoPath: logo, // Strictly this institution's logo, or null
            slug: school.slug,
          };

          await redisCache.set(cacheKey, result, 3600);
          return result;
        }
      }
    }

    // Default neutral branding for main platform / portal domain
    // NEVER return another school's logo!
    return {
      id: null,
      name: "Edut Pro",
      logoPath: null,
      slug: "main",
    };
  } catch (error) {
    console.error("Error fetching school branding:", error);
  }

  return {
    id: null,
    name: "Edut Pro",
    logoPath: null,
    slug: "main",
  };
}
