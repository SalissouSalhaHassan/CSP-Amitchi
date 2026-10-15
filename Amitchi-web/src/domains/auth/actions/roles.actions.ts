"use server";

import { db } from "@/infrastructure/database";
import { roles, rolePermissions, users } from "@/infrastructure/database/schema/auth";
import { eq, sql, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";

export const getRoles = async () => {
  try {
    const user = await getCurrentUser();
    const schoolId = await getActiveSchoolId();

    let data: any[] = [];
    try {
      data = await db.query.roles.findMany({
        with: {
          permissions: true,
          users: {
            where: user?.superAdmin ? undefined : eq(users.schoolId, schoolId),
            columns: {
              id: true
            }
          },
        },
      });
    } catch (relErr) {
      console.warn("[getRoles] Relational query error, falling back to direct select:", relErr);
    }

    if (!data || data.length === 0) {
      // Direct raw query fallback
      const rawRoles = await db.execute(sql`
        SELECT 
          r.id, 
          r.role_name AS "roleName", 
          r.description,
          COALESCE(
            json_agg(
              json_build_object(
                'id', rp.id,
                'moduleName', rp.module_name,
                'canView', rp.can_view,
                'canEdit', rp.can_edit,
                'canDelete', rp.can_delete,
                'fieldPermissions', rp.field_permissions
              )
            ) FILTER (WHERE rp.id IS NOT NULL), 
            '[]'
          ) AS permissions,
          COALESCE(
            json_agg(
              json_build_object('id', u.id)
            ) FILTER (WHERE u.id IS NOT NULL), 
            '[]'
          ) AS users
        FROM "roles" r
        LEFT JOIN "role_permissions" rp ON rp.role_id = r.id
        LEFT JOIN "users" u ON u.role_id = r.id AND (${user?.superAdmin ? sql`TRUE` : sql`u.school_id = ${schoolId}`})
        GROUP BY r.id, r.role_name, r.description
        ORDER BY r.id ASC
      `) as any;

      const rows = Array.isArray(rawRoles) ? (Array.isArray(rawRoles[0]) ? rawRoles[0] : rawRoles) : [];
      if (rows.length > 0) {
        data = rows.map((r: any) => ({
          id: Number(r.id),
          roleName: String(r.roleName || r.role_name),
          description: r.description,
          permissions: typeof r.permissions === "string" ? JSON.parse(r.permissions) : (r.permissions || []),
          users: typeof r.users === "string" ? JSON.parse(r.users) : (r.users || []),
        }));
      }
    }

    // Ultimate simple fallback if joins failed
    if (!data || data.length === 0) {
      const basicRoles = await db.select().from(roles);
      data = basicRoles.map(r => ({
        ...r,
        permissions: [],
        users: []
      }));
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("getRoles Error:", error);
    try {
      const basicRoles = await db.select().from(roles);
      return {
        success: true,
        data: basicRoles.map(r => ({ ...r, permissions: [], users: [] }))
      };
    } catch (_) {
      return { success: false, error: error.message, data: [] };
    }
  }
};

export const createRole = async (roleName: string, description?: string) => {
  return protectedDbAction("Security", "canEdit", async () => {
    const [newRole] = await db.insert(roles).values({
      roleName,
      description,
    }).returning();
    
    revalidatePath("/dashboard/security");
    return newRole;
  });
};

/** Inline version — returns the created role directly (no page revalidation needed for modal use) */
export const createRoleInline = async (roleName: string) => {
  "use server";
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false as const, error: "Non autorisé" };

    const { getUserRoleType, hasAllEducationalLevels } = await import("@/domains/auth/services/rbac");
    const roleType = await getUserRoleType(user);
    const hasRestrictedLevel = user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel);
    if (!user.superAdmin && (roleType === "level_director" || hasRestrictedLevel)) {
      return { success: false as const, error: "Non autorisé : la création de rôles est réservée à la direction générale." };
    }

    const trimmed = roleName.trim();
    if (!trimmed) return { success: false as const, error: "Nom de rôle requis" };

    // 1. Direct SQL check if role already exists
    const existing = await db.execute(sql`
      SELECT "id", "role_name" AS "roleName" 
      FROM "roles" 
      WHERE LOWER(TRIM("role_name")) = LOWER(TRIM(${trimmed}))
      LIMIT 1
    `) as any;

    const existingRow = Array.isArray(existing) ? (Array.isArray(existing[0]) ? existing[0][0] : existing[0]) : existing;
    if (existingRow && existingRow.id) {
      return { success: true as const, data: { id: Number(existingRow.id), roleName: String(existingRow.roleName || trimmed) } };
    }

    // 2. Direct atomic insert with conflict resolution
    const inserted = await db.execute(sql`
      INSERT INTO "roles" ("role_name")
      VALUES (${trimmed})
      ON CONFLICT ("role_name") DO UPDATE SET "role_name" = EXCLUDED."role_name"
      RETURNING "id", "role_name" AS "roleName"
    `) as any;

    const row = Array.isArray(inserted) ? (Array.isArray(inserted[0]) ? inserted[0][0] : inserted[0]) : inserted;
    revalidatePath("/dashboard/security");
    revalidatePath("/dashboard/security/users");
    return { success: true as const, data: { id: Number(row.id), roleName: String(row.roleName || trimmed) } };
  } catch (error: any) {
    console.error("[createRole] Error:", error);
    // Ultimate fallback: direct fetch by name
    try {
      const fallback = await db.execute(sql`
        SELECT "id", "role_name" AS "roleName" 
        FROM "roles" 
        WHERE LOWER(TRIM("role_name")) = LOWER(TRIM(${roleName.trim()}))
        LIMIT 1
      `) as any;
      const fRow = Array.isArray(fallback) ? (Array.isArray(fallback[0]) ? fallback[0][0] : fallback[0]) : fallback;
      if (fRow && fRow.id) {
        return { success: true as const, data: { id: Number(fRow.id), roleName: String(fRow.roleName || roleName.trim()) } };
      }
    } catch (_) {}

    const msg: string = error?.message || "Erreur lors de la création du rôle";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { success: false as const, error: "Ce nom de rôle existe déjà" };
    }
    return { success: false as const, error: msg };
  }
};

export const deleteRole = async (roleId: number) => {
  return protectedDbAction("Security", "canDelete", async () => {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));
    
    revalidatePath("/dashboard/security");
    return { success: true };
  });
};

export const updateRolePermissions = async (roleId: number, permissions: any[]) => {
  return protectedDbAction("Security", "canEdit", async () => {
    // Delete existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    
    // Insert new permissions (only those with at least one true value or custom fieldPermissions)
    const validPerms = permissions.filter(p => p.canView || p.canEdit || p.canDelete || (p.fieldPermissions && Object.keys(p.fieldPermissions).length > 0));
    if (validPerms.length > 0) {
      await db.insert(rolePermissions).values(
        validPerms.map(p => ({
          roleId,
          moduleName: p.moduleName,
          canView: p.canView ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          fieldPermissions: p.fieldPermissions ? JSON.stringify(p.fieldPermissions) : null,
        }))
      );
    }
    
    revalidatePath("/dashboard/security");
    return { success: true };
  });
};
