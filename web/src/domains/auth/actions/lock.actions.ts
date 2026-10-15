"use server";

import { getCurrentUser } from "@/domains/auth/services/session";
import { db } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createClient } from "@/shared/utils/supabase/server";

function checkPasswordMatch(plainPassword: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  if (storedHash === plainPassword) return true;
  try {
    if (bcrypt.compareSync(plainPassword, storedHash)) return true;
  } catch (_) {}
  try {
    const md5 = crypto.createHash("md5").update(plainPassword).digest("hex");
    if (md5.toLowerCase() === storedHash.toLowerCase()) return true;
  } catch (_) {}
  try {
    const sha256 = crypto.createHash("sha256").update(plainPassword).digest("hex");
    if (sha256.toLowerCase() === storedHash.toLowerCase()) return true;
  } catch (_) {}
  return false;
}

export async function verifyUnlockPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
    }

    const trimmedPassword = (password || "").trim();
    if (!trimmedPassword) {
      return { success: false, error: "Veuillez entrer votre mot de passe." };
    }

    // 1. Check in PostgreSQL database users table
    if (user.id) {
      try {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, Number(user.id)),
        });

        if (dbUser?.motDePasse && dbUser.motDePasse !== "SUPABASE_AUTH") {
          if (checkPasswordMatch(trimmedPassword, dbUser.motDePasse)) {
            return { success: true };
          }
        }
      } catch (dbErr) {
        console.warn("[verifyUnlockPassword] DB check warning:", dbErr);
      }
    }

    // 2. Check via Supabase Auth
    try {
      const supabase = await createClient();
      const rawUser = user as Record<string, any>;
      const loginEmail: string = String(rawUser.email || rawUser.utilisateur || "");
      const formattedEmail = loginEmail.includes("@") ? loginEmail : `${loginEmail}@test.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: trimmedPassword,
      });

      if (!error && data?.user) {
        return { success: true };
      }
    } catch (sbErr) {
      console.warn("[verifyUnlockPassword] Supabase check warning:", sbErr);
    }

    return { success: false, error: "Mot de passe incorrect." };
  } catch (err) {
    console.error("[verifyUnlockPassword] Error:", err);
    return { success: false, error: "Erreur de vérification. Réessayez." };
  }
}
