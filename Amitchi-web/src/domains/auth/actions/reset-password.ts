"use server";

import { db } from "@/infrastructure/database";
import { users, schools, roles } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface ResetPasswordParams {
  role: "student" | "teacher";
  schoolSlug: string;
  matriculeOrEmail: string;
  verificationCodeOrPhone: string; // PIN d'activation OU Numéro de téléphone
  newPassword?: string; // Si fourni, réinitialise le mot de passe
}

/**
 * Normalise un numéro de téléphone en gardant uniquement les chiffres
 */
function normalizePhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/**
 * Synchronise et garantit la présence du compte dans auth.users et auth.identities de Supabase
 */
async function syncSupabaseAuthUser(params: {
  email: string;
  passwordText?: string;
  hashedPassword: string;
  fullName: string;
  schoolId: number;
  studentId?: number | null;
  employeeId?: number | null;
  existingSupabaseId?: string | null;
}): Promise<string | null> {
  const {
    email,
    passwordText,
    hashedPassword,
    fullName,
    schoolId,
    studentId,
    employeeId,
    existingSupabaseId,
  } = params;

  // 1. Prioritize Supabase JS Admin client if service role key is available
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (serviceRoleKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { createClient: createSupabaseJsClient } = await import("@supabase/supabase-js");
      const adminClient = createSupabaseJsClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      if (existingSupabaseId && existingSupabaseId.length === 36) {
        const updatePayload: any = {
          email,
          user_metadata: {
            full_name: fullName,
            school_id: schoolId,
            student_id: studentId || null,
            employee_id: employeeId || null,
          },
        };
        if (passwordText) updatePayload.password = passwordText;
        await adminClient.auth.admin.updateUserById(existingSupabaseId, updatePayload);
        return existingSupabaseId;
      }
    }
  } catch (adminErr) {
    console.warn("[syncSupabaseAuthUser] Supabase admin client warning:", adminErr);
  }

  // 2. Direct PostgreSQL auth.users upsert
  try {
    const userMeta = JSON.stringify({
      full_name: fullName,
      school_id: schoolId,
      student_id: studentId || null,
      employee_id: employeeId || null,
    });

    const isUuid = existingSupabaseId && existingSupabaseId.length === 36;

    let result: any;
    if (isUuid) {
      result = await db.execute(sql`
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          recovery_sent_at,
          last_sign_in_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          ${existingSupabaseId}::uuid,
          'authenticated',
          'authenticated',
          ${email},
          ${hashedPassword},
          NOW(),
          NOW(),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          ${userMeta}::jsonb,
          NOW(),
          NOW(),
          '',
          '',
          '',
          ''
        )
        ON CONFLICT (email) DO UPDATE SET
          encrypted_password = ${hashedPassword},
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
          raw_user_meta_data = ${userMeta}::jsonb,
          updated_at = NOW()
        RETURNING id;
      `);
    } else {
      result = await db.execute(sql`
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          recovery_sent_at,
          last_sign_in_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          ${email},
          ${hashedPassword},
          NOW(),
          NOW(),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          ${userMeta}::jsonb,
          NOW(),
          NOW(),
          '',
          '',
          '',
          ''
        )
        ON CONFLICT (email) DO UPDATE SET
          encrypted_password = ${hashedPassword},
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
          raw_user_meta_data = ${userMeta}::jsonb,
          updated_at = NOW()
        RETURNING id;
      `);
    }

    const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
    const authId = rows[0]?.id ? String(rows[0].id) : existingSupabaseId;

    if (authId && authId.length === 36) {
      try {
        await db.execute(sql`
          INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${authId}::uuid,
            jsonb_build_object('sub', ${authId}::text, 'email', ${email}),
            'email',
            ${authId}::text,
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (provider, provider_id) DO UPDATE SET
            identity_data = jsonb_build_object('sub', ${authId}::text, 'email', ${email}),
            updated_at = NOW();
        `);
      } catch (idErr) {
        console.warn("[syncSupabaseAuthUser] auth.identities warning:", idErr);
      }
      return authId;
    }
  } catch (err) {
    console.warn("[syncSupabaseAuthUser] SQL direct upsert failed, trying client signUp fallback:", err);
  }

  // 3. Fallback to client signUp if SQL execution had issues
  if (passwordText) {
    try {
      const { createClient } = await import("@/shared/utils/supabase/server");
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.signUp({
        email,
        password: passwordText,
        options: {
          data: {
            full_name: fullName,
            school_id: schoolId,
            student_id: studentId,
            employee_id: employeeId,
          },
        },
      });
      if (authData?.user?.id) {
        return authData.user.id;
      }
    } catch (signUpErr) {
      console.warn("[syncSupabaseAuthUser] signUp fallback warning:", signUpErr);
    }
  }

  return existingSupabaseId || null;
}

export async function recoverAndResetAccount(params: ResetPasswordParams) {
  const { role, schoolSlug, matriculeOrEmail, verificationCodeOrPhone, newPassword } = params;

  try {
    if (!schoolSlug || !matriculeOrEmail || !verificationCodeOrPhone) {
      return { success: false, error: "Veuillez remplir tous les champs d'identification." };
    }

    let cleanSchool = schoolSlug.trim();
    // Strip domain if host passed (e.g. group-aiiu-niger.edut.pro -> group-aiiu-niger)
    if (cleanSchool.includes(".")) {
      cleanSchool = cleanSchool.split(".")[0];
    }

    const cleanMatricule = matriculeOrEmail.trim();
    const cleanVerification = verificationCodeOrPhone.trim().toLowerCase();
    const verificationDigits = normalizePhoneDigits(cleanVerification);

    // 1. Trouver l'établissement (recherche flexible par slug, id, ou nom)
    const schoolIdNum = parseInt(cleanSchool);
    let school = await db.query.schools.findFirst({
      where: or(
        eq(schools.slug, cleanSchool),
        eq(schools.slug, cleanSchool.toLowerCase()),
        isNaN(schoolIdNum) ? undefined : eq(schools.id, schoolIdNum)
      ),
    });

    if (!school) {
      // Fallback search by ILIKE in slug or name
      const fuzzySchools = await db.execute(sql`
        SELECT id, name, slug 
        FROM schools 
        WHERE LOWER(slug) = LOWER(${cleanSchool}) 
           OR LOWER(name) LIKE LOWER(${'%' + cleanSchool + '%'})
        LIMIT 1;
      `);
      const rows = Array.isArray(fuzzySchools) ? fuzzySchools : (fuzzySchools as any)?.rows || [];
      if (rows.length > 0) {
        school = rows[0];
      }
    }

    if (!school) {
      // If only 1 school exists in system, fallback to it
      const defaultSchool = await db.query.schools.findFirst();
      if (defaultSchool) {
        school = defaultSchool;
      }
    }

    if (!school) {
      return { success: false, error: "Établissement scolaire introuvable." };
    }

    let linkedUser: any = null;
    let personFullName = "";
    let recoveredUsername = "";
    let studentRecord: any = null;
    let employeeRecord: any = null;

    // 2. Vérification d'identité selon le rôle
    if (role === "student") {
      // Trouver l'élève dans la base
      const student = await db.query.students.findFirst({
        where: and(
          eq(students.schoolId, school.id),
          or(
            eq(students.numAdmission, cleanMatricule),
            eq(students.numAdmission, cleanMatricule.toUpperCase()),
            eq(students.numAdmission, cleanMatricule.toLowerCase())
          )
        ),
      });

      if (!student) {
        // Also try matching by user account linked to student
        const userWithStudent = await db.query.users.findFirst({
          where: and(
            eq(users.schoolId, school.id),
            or(
              eq(users.utilisateur, cleanMatricule),
              eq(users.utilisateur, cleanMatricule.toLowerCase())
            )
          ),
          with: { student: true }
        });

        if (userWithStudent?.student) {
          studentRecord = userWithStudent.student;
          linkedUser = userWithStudent;
        } else {
          return {
            success: false,
            error: "Aucun élève trouvé avec ce numéro d'admission dans cet établissement.",
          };
        }
      } else {
        studentRecord = student;
      }

      // Vérifier soit le PIN d'activation, soit le numéro de téléphone (mobile, whatsapp, phoneFixe)
      const pinMatch = studentRecord.activationPin && studentRecord.activationPin.trim().toLowerCase() === cleanVerification;
      
      const sMobile = normalizePhoneDigits(studentRecord.mobile);
      const sWhatsapp = normalizePhoneDigits(studentRecord.whatsapp);
      const sPhoneFixe = normalizePhoneDigits(studentRecord.phoneFixe);

      const phoneMatch = verificationDigits.length >= 4 && (
        (sMobile.length > 0 && (sMobile.includes(verificationDigits) || verificationDigits.includes(sMobile))) ||
        (sWhatsapp.length > 0 && (sWhatsapp.includes(verificationDigits) || verificationDigits.includes(sWhatsapp))) ||
        (sPhoneFixe.length > 0 && (sPhoneFixe.includes(verificationDigits) || verificationDigits.includes(sPhoneFixe)))
      );

      if (!pinMatch && !phoneMatch) {
        return {
          success: false,
          error: "Le code d'activation ou le numéro de téléphone ne correspond pas au dossier de l'élève.",
        };
      }

      personFullName = studentRecord.nomEtudiant || "Élève";

      // Trouver le compte utilisateur lié s'il n'est pas déjà trouvé
      if (!linkedUser) {
        linkedUser = await db.query.users.findFirst({
          where: and(
            eq(users.schoolId, school.id),
            or(
              eq(users.studentId, studentRecord.id),
              eq(users.utilisateur, cleanMatricule),
              eq(users.utilisateur, cleanMatricule.toLowerCase())
            )
          ),
        });
      }
    } else {
      // Enseignant
      const employee = await db.query.employees.findFirst({
        where: and(
          eq(employees.schoolId, school.id),
          or(
            eq(employees.empId, cleanMatricule),
            eq(employees.email, cleanMatricule),
            eq(employees.email, cleanMatricule.toLowerCase())
          )
        ),
      });

      if (!employee) {
        // Also try matching by user account linked to employee
        const userWithEmp = await db.query.users.findFirst({
          where: and(
            eq(users.schoolId, school.id),
            or(
              eq(users.utilisateur, cleanMatricule),
              eq(users.utilisateur, cleanMatricule.toLowerCase())
            )
          ),
          with: { employee: true }
        });

        if (userWithEmp?.employee) {
          employeeRecord = userWithEmp.employee;
          linkedUser = userWithEmp;
        } else {
          return {
            success: false,
            error: "Aucun enseignant trouvé avec ce matricule ou email dans cet établissement.",
          };
        }
      } else {
        employeeRecord = employee;
      }

      const pinMatch = employeeRecord.activationPin && employeeRecord.activationPin.trim().toLowerCase() === cleanVerification;
      
      const eMobile = normalizePhoneDigits(employeeRecord.mobile);
      const phoneMatch = verificationDigits.length >= 4 && eMobile.length > 0 && (
        eMobile.includes(verificationDigits) || verificationDigits.includes(eMobile)
      );
      const emailMatch = employeeRecord.email && employeeRecord.email.trim().toLowerCase() === cleanVerification;

      if (!pinMatch && !phoneMatch && !emailMatch) {
        return {
          success: false,
          error: "Le code d'activation ou le numéro de téléphone ne correspond pas au dossier de l'enseignant.",
        };
      }

      personFullName = employeeRecord.nom || "Enseignant";

      // Trouver le compte utilisateur lié s'il n'est pas déjà trouvé
      if (!linkedUser) {
        linkedUser = await db.query.users.findFirst({
          where: and(
            eq(users.schoolId, school.id),
            or(
              eq(users.employeeId, employeeRecord.id),
              eq(users.utilisateur, cleanMatricule),
              eq(users.utilisateur, cleanMatricule.toLowerCase())
            )
          ),
        });
      }
    }

    // 3. Déterminer l'email de connexion unique
    let loginEmail = "";
    if (cleanMatricule.includes("@")) {
      loginEmail = cleanMatricule.toLowerCase();
    } else if (linkedUser?.utilisateur && linkedUser.utilisateur.includes("@")) {
      loginEmail = linkedUser.utilisateur.toLowerCase();
    } else if (employeeRecord?.email && employeeRecord.email.includes("@")) {
      loginEmail = employeeRecord.email.toLowerCase();
    } else {
      const baseUser = linkedUser?.utilisateur || cleanMatricule.toLowerCase();
      loginEmail = baseUser.includes("@") ? baseUser : `${baseUser}@test.com`;
    }

    recoveredUsername = loginEmail;

    const effectivePassword = newPassword && newPassword.trim().length > 0
      ? newPassword.trim()
      : (linkedUser ? null : "Edut2025!");

    if (newPassword && newPassword.trim().length > 0 && newPassword.trim().length < 4) {
      return { success: false, error: "Le mot de passe doit contenir au moins 4 caractères." };
    }

    let hashedPassword: string | null = null;
    if (effectivePassword) {
      hashedPassword = await bcrypt.hash(effectivePassword, 10);
    }

    // Synchronisation Supabase Auth
    let supabaseAuthId: string | null = linkedUser?.supabaseId || null;
    if (hashedPassword && effectivePassword) {
      supabaseAuthId = await syncSupabaseAuthUser({
        email: loginEmail,
        passwordText: effectivePassword,
        hashedPassword,
        fullName: personFullName,
        schoolId: school.id,
        studentId: studentRecord?.id,
        employeeId: employeeRecord?.id,
        existingSupabaseId: linkedUser?.supabaseId,
      });
    }

    // 4. Création ou mise à jour de la table Postgres users
    if (!linkedUser) {
      const roleName = role === "student" ? "Élève" : "Enseignant";
      let roleRow = await db.query.roles.findFirst({
        where: eq(roles.roleName, roleName),
      });
      if (!roleRow) {
        const insertedRole = await db.insert(roles).values({
          roleName,
          description: `Rôle automatique pour ${roleName}`,
        }).returning();
        roleRow = insertedRole[0];
      }

      const defaultHashed = hashedPassword || (await bcrypt.hash("Edut2025!", 10));

      const insertedUser = await db.insert(users).values({
        schoolId: school.id,
        utilisateur: loginEmail,
        supabaseId: supabaseAuthId,
        nomPrenom: personFullName,
        motDePasse: defaultHashed,
        admin: false,
        superAdmin: false,
        roleId: roleRow?.id,
        langue: "FR",
        educationalLevel: studentRecord?.educationalLevel || "Primaire",
        studentId: studentRecord?.id || null,
        employeeId: employeeRecord?.id || null,
      }).returning();

      linkedUser = insertedUser[0];
    } else if (hashedPassword) {
      await db.update(users).set({
        utilisateur: loginEmail,
        motDePasse: hashedPassword,
        supabaseId: supabaseAuthId || linkedUser.supabaseId,
      }).where(eq(users.id, linkedUser.id));
    }

    return {
      success: true,
      data: {
        email: loginEmail,
        username: loginEmail,
        fullName: personFullName,
        schoolName: school.name,
        message: newPassword
          ? "Votre mot de passe a été réinitialisé avec succès !"
          : "Identité vérifiée avec succès !",
      },
    };
  } catch (error: any) {
    console.error("[recoverAndResetAccount] Error:", error);
    return {
      success: false,
      error: error?.message || "Une erreur est survenue lors de la vérification du compte.",
    };
  }
}
