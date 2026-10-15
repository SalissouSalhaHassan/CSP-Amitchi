import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveEducationalLevel } from "@/domains/auth/services/rbac";

export async function getCurrentEducationalLevel(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return await getActiveEducationalLevel(user);
}

export async function isUserAdminOrManager(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.admin === true;
}