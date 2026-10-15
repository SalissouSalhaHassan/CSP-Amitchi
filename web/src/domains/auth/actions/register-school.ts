"use server";

import { db } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { safeDbAction } from "@/lib/safe-action";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/shared/utils/supabase/server";

export async function registerSchoolAction(formData: {
  schoolName: string;
  slug: string;
  customDomain?: string;
  adminName: string;
  adminUsername: string;
  motDePasse: string;
}) {
  return safeDbAction(async () => {
    const { schoolName, slug, customDomain, adminName, adminUsername, motDePasse } = formData;

    // 1. Basic Validation
    if (!schoolName || !slug || !adminName || !adminUsername || !motDePasse) {
      throw new Error("جميع الحقول مطلوبة");
    }

    // Prepare login email (same logic as login action)
    let loginEmail = adminUsername;
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@test.com`;
    }

    // 2. Hash Password (for local DB fallback)
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    const supabase = await createClient();
    
    // Check if school slug or custom domain exists before anything else
    const existingSchool = await db.query.schools.findFirst({
      where: (schools, { eq, or }) => or(
        eq(schools.slug, slug.toLowerCase()),
        customDomain ? eq(schools.customDomain, customDomain.toLowerCase()) : undefined
      )
    });

    if (existingSchool) {
      throw new Error("هذا الرابط أو النطاق مستخدم بالفعل، يرجى اختيار اسم آخر");
    }

    // 3. Create Supabase User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: loginEmail,
      password: motDePasse,
      options: {
        data: {
          full_name: adminName,
        }
      }
    });

    if (authError) {
      throw new Error(`فشل إنشاء الحساب: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("فشل في الحصول على بيانات المستخدم من Supabase");
    }

    return await db.transaction(async (tx) => {
      // 4. Create School
      const [newSchool] = await tx.insert(schools).values({
        name: schoolName,
        slug: slug.toLowerCase(),
        customDomain: customDomain?.toLowerCase(),
        status: "active",
        plan: "basic",
      }).returning();

      if (!newSchool) throw new Error("فشل في إنشاء سجل المدرسة");

      // 5. Create Admin User for this school
      const [newAdmin] = await tx.insert(users).values({
        schoolId: newSchool.id,
        utilisateur: adminUsername,
        supabaseId: authData.user?.id,
        nomPrenom: adminName,
        motDePasse: hashedPassword,
        admin: true,
        superAdmin: false,
      }).returning();

      if (!newAdmin) throw new Error("فشل في إنشاء حساب المسؤول في قاعدة البيانات");

      revalidatePath("/");
      return { 
        success: true, 
        school: newSchool,
        admin: { id: newAdmin.id, username: newAdmin.utilisateur }
      };
    });
  });
}
