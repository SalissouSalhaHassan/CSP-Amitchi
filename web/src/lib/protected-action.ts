import { safeDbAction, ActionResponse } from "./safe-action";
import { getCurrentUser } from "@/domains/auth/services/session";
import { hasPermission, PermissionAction } from "@/domains/auth/services/rbac";
import { db } from "@/infrastructure/database";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { headers } from "next/headers";

/**
 * Ensures the user is authenticated and has the required permission 
 * before executing the database action.
 */
export async function protectedDbAction<T>(
  moduleName: string,
  actionType: PermissionAction,
  action: (user: any) => Promise<T>,
  auditInfo?: { tableName: string; recordId?: string; oldData?: any }
): Promise<ActionResponse<T>> {
  const start = Date.now();
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return { error: "Non autorisé. Veuillez vous connecter.", success: false };
    }

    const isAdmin = Boolean(user.admin === true || user.superAdmin === true || user.superAdmin === 1);

    if (!isAdmin) {
      const permitted = await hasPermission(user.id, moduleName, actionType);
      if (!permitted) {
        return { error: `Accès refusé. Vous n'avez pas la permission pour l'action ${actionType} dans le module ${moduleName}.`, success: false };
      }
    }

    const result = await safeDbAction(() => action(user));
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`🐢 [protectedDbAction] ${moduleName}:${actionType} took ${duration}ms`);
    }

    // Audit logging: Automatically log any successful sensitive modifications (canEdit/canDelete) or explicit audit logs
    const isSensitive = actionType === "canEdit" || actionType === "canDelete";
    if ((auditInfo || isSensitive) && result.success) {
      try {
        const headerList = await headers();
        const ip = headerList.get("x-forwarded-for") || "unknown";
        const userAgent = headerList.get("user-agent") || "unknown";

        await db.insert(auditLogs).values({
          schoolId: user.schoolId,
          userId: user.id,
          action: actionType.toUpperCase(),
          tableName: auditInfo?.tableName || moduleName,
          recordId: auditInfo?.recordId || "n/a",
          oldData: auditInfo?.oldData ? JSON.stringify(auditInfo.oldData) : null,
          newData: result.data ? JSON.stringify(result.data) : null,
          ipAddress: ip,
          userAgent: userAgent,
        });
      } catch (auditError) {
        console.error("Audit Logging Failed:", auditError);
        // We don't fail the main action if audit logging fails
      }
    }

    return result;
  } catch (error: any) {
    // Manually check for Next.js redirect/not-found errors to avoid TypeError if the built-in functions are missing
    if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_NOT_FOUND')) {
      throw error;
    }

    console.error("Protected Action Error:", error);
    const isDev = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    return { 
      error: isDev ? `Erreur de sécurité: ${error.message || "Inconnue"}` : "Une erreur de sécurité est survenue.", 
      success: false 
    };
  }
}

import { isConfiguredPlatformOwner } from "@/domains/auth/services/session";

/**
 * Ensures the user is a Super Admin (Platform Owner)
 */
export async function superAdminAction<T>(
  action: (user: any) => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const user = await getCurrentUser();
    
    const isSuper = Boolean(
      user && (
        user.superAdmin === true ||
        user.superAdmin === 1 ||
        user.admin === true ||
        isConfiguredPlatformOwner(user.utilisateur)
      )
    );

    if (!isSuper) {
      return { error: "Accès réservé au propriétaire de la plateforme.", success: false };
    }

    return await safeDbAction(() => action(user));
  } catch (error: any) {
    console.error("Super Admin Action Error:", error);
    return { error: "Une erreur de sécurité est survenue.", success: false };
  }
}
