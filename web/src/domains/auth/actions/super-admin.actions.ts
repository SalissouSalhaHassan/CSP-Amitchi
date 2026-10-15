"use server";

import { db } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { eq, sql, count, desc } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { revalidatePath } from "next/cache";

/**
 * Get platform-wide statistics for Super Admin
 */
export async function getPlatformStats() {
  return protectedDbAction("Admin", "canView", async (user) => {
    const isSuper = Boolean(user && (user.superAdmin === true || user.superAdmin === 1 || user.admin === true));
    if (!isSuper) throw new Error("Accès non autorisé.");

    const [schoolsCount] = await db.select({ count: count() }).from(schools);
    const [studentsCount] = await db.select({ count: count() }).from(students);
    const [activeSchools] = await db.select({ count: count() }).from(schools).where(eq(schools.status, "active"));

    return {
      stats: {
        totalSchools: schoolsCount.count,
        totalStudents: studentsCount.count,
        activeSchools: activeSchools.count,
        revenue: 0, // Placeholder for subscription revenue
      }
    };
  });
}

/**
 * Get list of all schools for management
 */
export async function getAllSchools() {
  return protectedDbAction("Admin", "canView", async (user) => {
    const isSuper = Boolean(user && (user.superAdmin === true || user.superAdmin === 1 || user.admin === true));
    if (!isSuper) throw new Error("Accès non autorisé.");

    const data = await db.query.schools.findMany({
      orderBy: [desc(schools.createdAt)],
      with: {
        // We can add a relation to count users/students per school if needed
      }
    });

    return { data };
  });
}

/**
 * Update school status or plan
 */
export async function updateSchoolStatus(
  schoolIdOrObj: number | { id: number | string; status?: string; plan?: string },
  dataParam?: { status?: string; plan?: string }
) {
  return protectedDbAction("Admin", "canEdit", async (user) => {
    const isSuper = Boolean(user && (user.superAdmin === true || user.superAdmin === 1 || user.admin === true));
    if (!isSuper) throw new Error("Accès non autorisé.");

    const schoolId = typeof schoolIdOrObj === "object" ? Number(schoolIdOrObj.id) : Number(schoolIdOrObj);
    const updateData = typeof schoolIdOrObj === "object"
      ? { ...(schoolIdOrObj.status ? { status: schoolIdOrObj.status } : {}), ...(schoolIdOrObj.plan ? { plan: schoolIdOrObj.plan } : {}) }
      : dataParam || {};

    const [updated] = await db.update(schools)
      .set(updateData)
      .where(eq(schools.id, schoolId))
      .returning();

    revalidatePath("/dashboard/super-admin");
    revalidatePath("/platform-admin");
    return updated || { success: true };
  });
}

/**
 * Create a new school manually
 */
export async function createSchoolAction(
  nameOrData: string | { name: string; slug: string; plan?: string; status?: string },
  slugParam?: string,
  planParam?: string,
  statusParam?: string
) {
  return protectedDbAction("Admin", "canEdit", async (user) => {
    const isSuper = Boolean(user && (user.superAdmin === true || user.superAdmin === 1 || user.admin === true));
    if (!isSuper) throw new Error("Accès non autorisé.");

    const name = typeof nameOrData === "object" ? nameOrData.name : nameOrData;
    const slug = typeof nameOrData === "object" ? nameOrData.slug : slugParam || "";
    const plan = typeof nameOrData === "object" ? nameOrData.plan || "basic" : planParam || "basic";
    const status = typeof nameOrData === "object" ? nameOrData.status || "active" : statusParam || "active";

    if (!name || !name.trim()) throw new Error("Le nom de l'école est requis.");
    if (!slug || !slug.trim()) throw new Error("Le slug (sous-domaine) est requis.");

    const cleanSlug = slug.trim().toLowerCase();

    // Check if slug is unique
    const existing = await db.query.schools.findFirst({
      where: eq(schools.slug, cleanSlug),
    });

    if (existing) {
      throw new Error("Ce sous-domaine (slug) est déjà utilisé.");
    }

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1); // 1 year of validity by default for manual creation

    const [newSchool] = await db.insert(schools).values({
      name: name.trim(),
      slug: cleanSlug,
      plan: plan || "basic",
      status: status || "active",
      subscriptionExpiry: expiry,
    }).returning();

    revalidatePath("/dashboard/super-admin");
    revalidatePath("/platform-admin");
    return newSchool || { success: true };
  });
}
