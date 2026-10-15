"use server";

import { db } from "@/infrastructure/database";
import { users, roles, loginLogs } from "@/infrastructure/database/schema/auth";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, desc, and, or, isNull, inArray, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import bcrypt from "bcryptjs";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType, getCompatibleLevels, checkEducationalLevelAccess, hasAllEducationalLevels } from "@/domains/auth/services/rbac";

export async function getSessionUserAction() {
  try {
    const user = await getCurrentUser();
    return { success: true, data: user };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

type SaveUserFormData = {
  utilisateur?: string;
  nomPrenom?: string;
  motDePasse?: string;
  admin?: boolean;
  superAdmin?: boolean;
  roleId?: unknown;
  langue?: string;
  educationalLevel?: string;
  avatarUrl?: string;
  supabaseId?: string;
  schoolId?: unknown;
  studentId?: unknown;   // Liaison Élève
  employeeId?: unknown;  // Liaison Enseignant
};

type RoleLookupRow = {
  id: number;
  roleName: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erreur inconnue";
}

function parseOptionalId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function rowsFromResult(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  }

  return [];
}

function normalizeRoleRows(result: unknown): RoleLookupRow[] {
  return rowsFromResult(result)
    .map((row) => {
      const id = Number(row.id);
      const roleName = typeof row.roleName === "string" ? row.roleName : String(row.role_name || "");
      return Number.isInteger(id) && id > 0 && roleName ? { id, roleName } : null;
    })
    .filter((row): row is RoleLookupRow => row !== null);
}

async function fetchRoleRows() {
  const result = await db.execute(sql`
    SELECT "id", "role_name" AS "roleName"
    FROM "roles"
    ORDER BY "id" ASC
  `);

  return normalizeRoleRows(result);
}

async function ensureDefaultRoles() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "roles" (
      "id" serial PRIMARY KEY,
      "role_name" varchar(50) NOT NULL UNIQUE,
      "description" varchar(200)
    )
  `);

  await db.execute(sql`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "role_name" varchar(50)`);
  await db.execute(sql`ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" varchar(200)`);
  await db.execute(sql`
    UPDATE "roles"
    SET "role_name" = 'Role ' || "id"::text
    WHERE "role_name" IS NULL OR "role_name" = ''
  `);
  await db.execute(sql`ALTER TABLE "roles" ALTER COLUMN "role_name" SET NOT NULL`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "roles_role_name_unique" ON "roles" ("role_name")`);
  await db.execute(sql`
    INSERT INTO "roles" ("role_name", "description")
    VALUES
      ('Administrateur', 'Accès administrateur au système'),
      ('Membre', 'Accès utilisateur standard')
    ON CONFLICT ("role_name") DO UPDATE
    SET "description" = EXCLUDED."description"
  `);
}

async function resolveUserRoleId(roleId: unknown, wantsAdminAccess: boolean) {
  const parsedRoleId = parseOptionalId(roleId);
  if (parsedRoleId) return { roleId: parsedRoleId };

  let availableRoles: RoleLookupRow[] = [];

  try {
    availableRoles = await fetchRoleRows();
  } catch (error: unknown) {
    console.warn("[saveUser] roles table lookup failed, attempting bootstrap:", getErrorMessage(error));
    await ensureDefaultRoles();
    availableRoles = await fetchRoleRows();
  }

  if (availableRoles.length === 0) {
    await ensureDefaultRoles();
    availableRoles = await fetchRoleRows();
  }

  if (availableRoles.length === 0) {
    return {
      roleId: null,
      error: "Aucun rôle disponible. Créez d'abord un rôle dans Sécurité > Gérer les Rôles.",
    };
  }

  const defaultRole = wantsAdminAccess
    ? availableRoles.find((role) => /admin|administrateur|super/i.test(role.roleName)) || availableRoles[0]
    : availableRoles[0];

  return { roleId: defaultRole.id };
}

export async function getUsers() {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Non autorisé", success: false };

    // Migration guard — ensure new columns exist before querying
    try {
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_id" integer`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" integer`);
      await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`);
    } catch (_migErr) {
      // Columns likely already exist — safe to ignore
    }

    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    console.log(`[getUsers] currentUser: id=${user.id}, superAdmin=${user.superAdmin}, schoolId=${user.schoolId}, activeSchoolId=${schoolId}, roleType=${roleType}`);

    // Multi-tenancy logic: 
    // Super Admins see everyone, regular users see their school's users or unassigned users
    let whereClause: SQL | undefined;
    if (user.superAdmin) {
      // superAdmin sees ALL users across platform
      whereClause = undefined;
    } else if (schoolId) {
      // Regular users filtered by their school or unassigned users
      whereClause = or(eq(users.schoolId, schoolId), isNull(users.schoolId));
    } else if (user.schoolId) {
      // Fallback to user's own schoolId or unassigned
      whereClause = or(eq(users.schoolId, user.schoolId), isNull(users.schoolId));
    } else {
      // Fallback for single-school environments
      whereClause = undefined;
    }

    // Non-admin regular users MUST NOT see platform Super Admin or Government Regulatory accounts
    if (!user.superAdmin && !user.admin) {
      const excludeGlobalAuthoritySql = sql`(
        coalesce(${users.superAdmin}, false) = false
        AND lower(coalesce(${users.utilisateur}, '')) NOT LIKE '%superadmin%'
        AND lower(coalesce(${users.utilisateur}, '')) NOT LIKE '%ministere%'
        AND lower(coalesce(${users.utilisateur}, '')) NOT LIKE '%dren%'
        AND lower(coalesce(${users.utilisateur}, '')) NOT LIKE '%dden%'
        AND lower(coalesce(${users.utilisateur}, '')) NOT LIKE '%inspection%'
      )`;
      whereClause = whereClause 
        ? and(whereClause, excludeGlobalAuthoritySql)
        : excludeGlobalAuthoritySql;
    }

    const hasRestrictedLevel = user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel);
    const isLevelScoped = !user.superAdmin && (roleType === "level_director" || roleType === "level_comptable" || hasRestrictedLevel);

    if (isLevelScoped) {
      let activeLevel: string | null | undefined = user.educationalLevel;
      if (!activeLevel && user.id) {
        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { educationalLevel: true },
        });
        activeLevel = freshUser?.educationalLevel;
      }

      if (activeLevel && !["tous", "all", "tous les niveaux"].includes(activeLevel.toLowerCase())) {
        const compatibleLevels = getCompatibleLevels(activeLevel);
        const compatibleLevelsSql = sql`ARRAY[${sql.join(compatibleLevels.map((level) => sql`${level}`), sql`, `)}]::text[]`;
        const levelMatchSql = sql`string_to_array(coalesce(${users.educationalLevel}, ''), ',') && ${compatibleLevelsSql}`;
        const excludeGlobalAdminsSql = sql`(
          coalesce(${users.superAdmin}, false) = false
          AND (
            coalesce(${users.admin}, false) = false OR
            (coalesce(${users.educationalLevel}, '') != '' AND coalesce(${users.educationalLevel}, '') NOT IN ('Tous', 'All', 'Tous les niveaux'))
          )
        )`;

        whereClause = whereClause 
          ? and(whereClause, levelMatchSql, excludeGlobalAdminsSql)
          : and(levelMatchSql, excludeGlobalAdminsSql);
      }
    }

    let data: any[] = [];
    try {
      data = await db.query.users.findMany({
        where: whereClause,
        with: { 
          role: true,
          school: true
        },
        orderBy: [desc(users.createdAt)],
      });
    } catch (_relErr) {
      console.warn("[getUsers] Relational query failed, executing fallback simple select:", _relErr);
      data = await db.select().from(users).where(whereClause).orderBy(desc(users.createdAt));
    }
    
    // Post-filter safety check for non-superAdmins
    if (!user.superAdmin) {
      const forbiddenTerms = ["superadmin", "super_admin", "ministere", "ministère", "dren", "dden", "inspection"];
      data = data.filter((u: any) => {
        const uName = (u.utilisateur || "").toLowerCase();
        const nName = (u.nomPrenom || "").toLowerCase();
        const rName = (u.role?.roleName || "").toLowerCase();
        const isForbidden = forbiddenTerms.some(term => uName.includes(term) || nName.includes(term) || rName.includes(term));
        return !isForbidden;
      });
    }
    
    console.log(`[getUsers] Found ${data.length} users (SuperAdmin: ${user.superAdmin}, schoolId filter: ${schoolId ?? user.schoolId ?? 'none'})`);
    return { data, success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("getUsers Error:", error);
    return { error: message, success: false, data: [] };
  }
}

export async function saveUser(formData: SaveUserFormData, id?: number) {
  console.log(`[saveUser] Attempting to save user. ID: ${id || 'NEW'}, Data:`, formData);
  
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Non autorisé. Veuillez vous connecter.", success: false };

    // SuperAdmins bypass the standard permission check (which requires a valid DB user id)
    const isSuperAdmin = currentUser.superAdmin === true || currentUser.superAdmin === 1;
    if (!isSuperAdmin) {
      // Check permission only for non-superAdmin users
      const { hasPermission, getUserRoleType } = await import("@/domains/auth/services/rbac");
      const roleType = await getUserRoleType(currentUser);
      
      // Directors (general and level) always can manage users in their school
      const isDirector = roleType === "directeur" || roleType === "general_director" || roleType === "level_director";
      
      if (!isDirector) {
        // For other roles, check the Security module permission
        const permitted = await hasPermission(currentUser.id, "Security", "canEdit");
        if (!permitted) {
          return { error: "Accès refusé. Vous n'avez pas la permission d'éditer les utilisateurs.", success: false };
        }
      }
    }

    const { utilisateur, nomPrenom, motDePasse, admin, superAdmin, roleId, langue, educationalLevel, avatarUrl, supabaseId, schoolId, studentId, employeeId } = formData;

    // Runtime migration guard
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_id" integer REFERENCES "students"("id")`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employee_id" integer REFERENCES "employees"("id")`);
    await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text`);
    const utilisateurValue = typeof utilisateur === "string" ? utilisateur.trim() : "";
    const nomPrenomValue = typeof nomPrenom === "string" ? nomPrenom.trim() : "";
    const passwordValue = typeof motDePasse === "string" ? motDePasse : "";
    const roleType = await getUserRoleType(currentUser);
    const requestedAdmin = !!admin;
    const requestedSuperAdmin = isSuperAdmin ? !!superAdmin : false;
    const resolvedRole = await resolveUserRoleId(roleId, requestedAdmin || requestedSuperAdmin);

    if (!resolvedRole.roleId) {
      return { error: resolvedRole.error || "Le rôle est requis", success: false };
    }

    const selectedSchoolId = parseOptionalId(schoolId);
    const currentSchoolId = parseOptionalId(currentUser.schoolId);

    if (!isSuperAdmin && !currentSchoolId) {
      return { error: "Aucune école active trouvée pour cet utilisateur.", success: false };
    }

    // Basic validation
    if (!utilisateurValue) return { error: "L'identifiant est requis", success: false };
    if (!nomPrenomValue) return { error: "Le nom complet est requis", success: false };

    const cleanUtilisateur = utilisateurValue.replace(/\s+/g, "");

    // Check if username is already taken by another user
    const existingDuplicate = await db.query.users.findFirst({
      where: and(
        eq(users.utilisateur, cleanUtilisateur),
        id ? sql`${users.id} != ${id}` : undefined
      ),
      columns: { id: true, nomPrenom: true, utilisateur: true }
    });

    if (existingDuplicate) {
      return {
        error: `L'identifiant "${cleanUtilisateur}" est déjà utilisé par un autre compte (${existingDuplicate.nomPrenom || "Utilisateur"}). Veuillez choisir un identifiant unique (ex: matricule ou email personnel).`,
        success: false,
      };
    }

    const data: Partial<typeof users.$inferInsert> & {
      utilisateur: string;
      nomPrenom: string;
      admin: boolean;
      roleId: number;
      langue: string;
      educationalLevel: string;
      avatarUrl?: string | null;
      supabaseId: string | null;
      schoolId: number | null;
      studentId: number | null;
      employeeId: number | null;
    } = {
      utilisateur: cleanUtilisateur,
      nomPrenom: nomPrenomValue,
      admin: requestedAdmin,
      superAdmin: isSuperAdmin ? requestedSuperAdmin : undefined,
      roleId: resolvedRole.roleId,
      langue: langue || "FR",
      educationalLevel: educationalLevel || "Primaire",
      avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
      supabaseId: supabaseId?.trim() || null,
      // Multi-tenancy: set schoolId.
      schoolId: isSuperAdmin ? selectedSchoolId : currentSchoolId,
      // Identity links
      studentId: parseOptionalId(studentId),
      employeeId: parseOptionalId(employeeId),
    };

    const hasRestrictedLevel = currentUser.educationalLevel && !hasAllEducationalLevels(currentUser.educationalLevel);
    const isLevelDirector = !isSuperAdmin && (roleType === "level_director" || hasRestrictedLevel);

    if (isLevelDirector) {
      data.admin = false;
      data.superAdmin = undefined;
      data.educationalLevel = currentUser.educationalLevel || "Primaire";

      if (resolvedRole.roleId) {
        const roleObj = await db.query.roles.findFirst({ where: eq(roles.id, resolvedRole.roleId) });
        const rName = (roleObj?.roleName || "").toLowerCase().trim();
        const forbiddenForLevelDirector = ["directeur", "dirigeant", "admin", "superadmin", "comptable", "caissier", "finance", "financier", "ministere", "ministère", "dren", "dden", "inspection"];
        if (forbiddenForLevelDirector.some((term) => rName.includes(term))) {
          return { error: `Accès refusé. En tant que directeur de cycle, vous ne pouvez pas attribuer le rôle "${roleObj?.roleName}".`, success: false };
        }
      }
    }

    if (passwordValue) {
      data.motDePasse = await bcrypt.hash(passwordValue, 10);
    }

    if (id) {
      console.log(`[saveUser] Updating existing user ${id} with:`, data);
      
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { id: true, schoolId: true, educationalLevel: true, supabaseId: true, utilisateur: true, studentId: true, employeeId: true }
      });
      
      if (!targetUser) return { error: "Utilisateur non trouvé", success: false };

      // Multi-tenancy: preserve existing schoolId if not explicitly changing
      data.schoolId = selectedSchoolId ?? targetUser.schoolId ?? currentSchoolId ?? null;

      // Multi-tenancy and level check for update (non-superAdmins only)
      if (!isSuperAdmin) {
        if (targetUser.schoolId && currentUser.schoolId && targetUser.schoolId !== currentUser.schoolId) {
          return { error: "Non autorisé : cet utilisateur appartient à une autre école", success: false };
        }
        if (roleType === "level_director" && !checkEducationalLevelAccess(currentUser, targetUser.educationalLevel)) {
          return { error: "Non autorisé : cet utilisateur appartient à un autre secteur", success: false };
        }
      }

      // Synchronize Supabase Auth for mobile & cloud auth
      let loginEmail = data.utilisateur;
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@test.com`;
      }

      const activeSupabaseId = data.supabaseId || targetUser.supabaseId;
      if (activeSupabaseId) {
        try {
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
            const { createClient: createSupabaseJsClient } = await import("@supabase/supabase-js");
            const adminClient = createSupabaseJsClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              serviceRoleKey,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );
            const updatePayload: any = {
              email: loginEmail,
              user_metadata: {
                full_name: data.nomPrenom,
                school_id: data.schoolId,
                student_id: data.studentId,
                employee_id: data.employeeId,
              }
            };
            if (passwordValue) {
              updatePayload.password = passwordValue;
            }
            await adminClient.auth.admin.updateUserById(activeSupabaseId, updatePayload);
          }
        } catch (supabaseSyncErr) {
          console.warn("[saveUser] Supabase auth update sync warning:", supabaseSyncErr);
        }
      } else {
        // Bootstrap Supabase ID if missing
        try {
          const { createClient } = await import("@/shared/utils/supabase/server");
          const supabase = await createClient();
          const { data: authData } = await supabase.auth.signUp({
            email: loginEmail,
            password: passwordValue || "Edut2025!",
            options: {
              data: {
                full_name: data.nomPrenom,
                school_id: data.schoolId,
                student_id: data.studentId,
                employee_id: data.employeeId,
              }
            }
          });
          if (authData?.user?.id) {
            data.supabaseId = authData.user.id;
          }
        } catch (signUpErr) {
          console.warn("[saveUser] Supabase signup bootstrap warning:", signUpErr);
        }
      }

      // Direct sync in Postgres auth.users table for Supabase Auth consistency
      if (data.motDePasse) {
        try {
          if (activeSupabaseId && activeSupabaseId.length === 36) {
            await db.execute(sql`
              UPDATE auth.users 
              SET encrypted_password = ${data.motDePasse},
                  email = ${loginEmail},
                  updated_at = NOW()
              WHERE id = ${activeSupabaseId}::uuid OR email = ${loginEmail}
            `);
          } else {
            await db.execute(sql`
              UPDATE auth.users 
              SET encrypted_password = ${data.motDePasse},
                  email = ${loginEmail},
                  updated_at = NOW()
              WHERE email = ${loginEmail}
            `);
          }
        } catch (authSqlErr) {
          console.warn("[saveUser] Direct auth.users SQL sync error:", authSqlErr);
        }
      }

      await db.update(users).set(data).where(eq(users.id, id));
      console.log(`[saveUser] Update success for user ${id}`);

      const updatedRecord = await db.query.users.findFirst({
        where: eq(users.id, id),
        with: {
          role: true,
          school: true,
        }
      });

      revalidatePath("/dashboard/security/users");
      revalidatePath("/dashboard/users");
      return { success: true, data: updatedRecord };
    } else {
      if (!passwordValue) return { error: "Mot de passe requis pour un nouvel utilisateur", success: false };
      
      // Create Supabase User automatically
      let loginEmail = data.utilisateur;
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@test.com`;
      }
      
      try {
        const { createClient } = await import("@/shared/utils/supabase/server");
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: loginEmail,
          password: passwordValue,
          options: {
            data: {
              full_name: data.nomPrenom,
              school_id: data.schoolId,
              student_id: data.studentId,
              employee_id: data.employeeId,
            }
          }
        });
        
        if (!authError && authData.user) {
          data.supabaseId = authData.user.id;
        }
      } catch (authErr) {
        console.warn("[saveUser] Supabase creation warning:", authErr);
      }

      console.log(`[saveUser] Inserting new user with:`, data);
      const insertRes = await db.insert(users).values(data as typeof users.$inferInsert).returning({ id: users.id });
      const newId = insertRes[0]?.id;

      const createdRecord = newId ? await db.query.users.findFirst({
        where: eq(users.id, newId),
        with: {
          role: true,
          school: true,
        }
      }) : data;

      revalidatePath("/dashboard/security/users");
      revalidatePath("/dashboard/users");
      return { success: true, data: createdRecord };
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("[saveUser] Error saving user:", error);
    // Return proper error message instead of throwing
    if (message.includes("unique") || message.includes("duplicate")) {
      return { error: "Cet identifiant existe déjà.", success: false };
    }
    return { error: message || "Erreur lors de l'enregistrement", success: false };
  }
}

export async function deleteUser(id: number) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Non autorisé. Veuillez vous connecter.", success: false };

    if (currentUser.id === id) {
      return { error: "Vous ne pouvez pas supprimer votre propre compte administrateur.", success: false };
    }

    const isSuperAdmin = currentUser.superAdmin === true || currentUser.superAdmin === 1;
    if (!isSuperAdmin) {
      const { hasPermission, getUserRoleType: getRoleType } = await import("@/domains/auth/services/rbac");
      const roleType = await getRoleType(currentUser);
      
      // Directors always can manage users in their school
      const isDirector = roleType === "directeur" || roleType === "general_director" || roleType === "level_director";
      
      if (!isDirector) {
        const permitted = await hasPermission(currentUser.id, "Security", "canDelete");
        if (!permitted) {
          return { error: "Accès refusé. Vous n'avez pas la permission de supprimer des utilisateurs.", success: false };
        }
      }
    }

    const roleType = await getUserRoleType(currentUser);

    // Multi-tenancy and level check for deletion (non-superAdmins only)
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { id: true, schoolId: true, educationalLevel: true, supabaseId: true, utilisateur: true }
    });
    
    if (!targetUser) return { error: "Utilisateur non trouvé", success: false };

    if (!isSuperAdmin) {
      if (targetUser.schoolId && currentUser.schoolId && targetUser.schoolId !== currentUser.schoolId) {
        return { error: "Non autorisé : cet utilisateur appartient à une autre école", success: false };
      }
      if (roleType === "level_director" && !checkEducationalLevelAccess(currentUser, targetUser.educationalLevel)) {
        return { error: "Non autorisé : cet utilisateur appartient à un autre secteur", success: false };
      }
    }

    // ── Delete related records before deleting user ──
    try {
      await db.execute(sql`DELETE FROM login_logs WHERE user_id = ${id}`);
    } catch (_) {}
    try {
      await db.execute(sql`DELETE FROM audit_logs WHERE user_id = ${id}`);
    } catch (_) {}
    try {
      await db.execute(sql`DELETE FROM notifications WHERE user_id = ${id}`);
    } catch (_) {}

    // ── Direct SQL purge from Postgres auth.users ──
    const userLogin = targetUser.utilisateur?.trim() || "";
    const emailAlt = userLogin.includes("@") ? userLogin : `${userLogin}@test.com`;

    try {
      if (targetUser.supabaseId && targetUser.supabaseId.length === 36) {
        await db.execute(sql`
          DELETE FROM auth.users 
          WHERE id = ${targetUser.supabaseId}::uuid OR email = ${userLogin} OR email = ${emailAlt}
        `);
      } else if (userLogin) {
        await db.execute(sql`
          DELETE FROM auth.users 
          WHERE email = ${userLogin} OR email = ${emailAlt}
        `);
      }
    } catch (authDelSqlErr) {
      console.warn("[deleteUser] Direct auth.users SQL delete warning:", authDelSqlErr);
    }

    // ── Delete from Supabase Auth admin client if exists ──
    if (targetUser.supabaseId) {
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          const { createClient: createSupabaseJsClient } = await import("@supabase/supabase-js");
          const adminClient = createSupabaseJsClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          await adminClient.auth.admin.deleteUser(targetUser.supabaseId);
        }
      } catch (supabaseDelErr) {
        console.warn("[deleteUser] Supabase admin delete warning:", supabaseDelErr);
      }
    }

    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/dashboard/security/users");
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("[deleteUser] Error:", error);
    return { error: message || "Erreur lors de la suppression", success: false };
  }
}
