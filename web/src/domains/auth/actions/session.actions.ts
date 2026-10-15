"use server";

import { getCurrentUser } from "@/domains/auth/services/session";

export async function getCurrentUserAction() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      utilisateur: user.utilisateur,
      superAdmin: user.superAdmin,
      admin: user.admin,
      role: user.role ? {
        roleName: user.role.roleName,
      } : null,
    };
  } catch (e) {
    console.error("getCurrentUserAction error:", e);
    return null;
  }
}
