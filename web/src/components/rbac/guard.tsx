import { getCurrentUser } from "@/domains/auth/services/session";
import { hasPermission, PermissionAction, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";
import { ReactNode } from "react";

interface GuardProps {
  module: string;
  action: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Server Component to conditionally render children based on user permissions.
 * Evaluates access using the unified RBAC system.
 */
export async function Guard({ module, action, children, fallback = null }: GuardProps) {
  const user = await getCurrentUser();

  if (!user) return fallback;
  
  const permitted = await hasPermission(user.id, module, action);

  if (permitted) {
    return children;
  }

  return fallback;
}

/**
 * Server Component to conditionally render children based on the user's educational level scope.
 */
interface LevelGuardProps {
  level: string | null | undefined;
  children: ReactNode;
  fallback?: ReactNode;
}

export async function LevelGuard({ level, children, fallback = null }: LevelGuardProps) {
  const user = await getCurrentUser();
  if (!user) return fallback;

  if (checkEducationalLevelAccess(user, level)) {
    return children;
  }

  return fallback;
}

/**
 * Helper function to enforce educational level access in Server Actions.
 * Throws an error if the user is not authorized to access the specified level.
 */
export async function checkLevelAccessOrThrow(resourceLevel: string | null | undefined) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Non authentifié");
  }
  
  if (!checkEducationalLevelAccess(user, resourceLevel)) {
    throw new Error("Accès interdit - Niveau éducatif non autorisé");
  }
}
