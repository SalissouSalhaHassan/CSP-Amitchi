"use server";

import { db, readDb } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { feePayments } from "@/infrastructure/database/schema/finance";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, sql, desc, count } from "drizzle-orm";
import { superAdminAction } from "@/lib/protected-action";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { addDomainToVercel, removeDomainFromVercel } from "../services/vercel";

/**
 * Global stats across all schools
 */
export async function getGlobalPlatformStats() {
  return superAdminAction(async () => {
    const [schoolsCount] = await readDb.select({ value: count() }).from(schools);
    const [studentsCount] = await readDb.select({ value: count() }).from(students);
    const [usersCount] = await readDb.select({ value: count() }).from(users);
    
    // Sum of all revenue across all schools
    const [totalRevenue] = await readDb.select({ 
      value: sql<number>`coalesce(sum(amount), 0)` 
    }).from(feePayments);

    return {
      schools: schoolsCount.value,
      students: studentsCount.value,
      users: usersCount.value,
      revenue: totalRevenue.value,
    };
  });
}

/**
 * Impersonate a school (Super Admin only)
 */
export async function impersonateSchool(schoolId: number | null) {
  return superAdminAction(async () => {
    const cookieStore = await cookies();
    if (schoolId) {
      (cookieStore as any).set("impersonated_school_id", schoolId.toString(), {
        maxAge: 3600, // 1 hour
        httpOnly: true,
      });
    } else {
      cookieStore.delete("impersonated_school_id");
    }
    
    revalidatePath("/", "layout");
    return { success: true };
  });
}

/**
 * List all schools with their details
 */
export async function getAllSchools() {
  return superAdminAction(async () => {
    return await readDb.query.schools.findMany({
      orderBy: [desc(schools.createdAt)],
    });
  });
}

/**
 * Update school status (active/suspended)
 */
export async function updateSchoolStatus(id: number, status: "active" | "suspended") {
  return superAdminAction(async () => {
    await db.update(schools)
      .set({ status })
      .where(eq(schools.id, id));
    
    revalidatePath("/platform-admin");
    return { success: true };
  });
}

/**
 * Update school plan
 */
export async function updateSchoolPlan(id: number, plan: "basic" | "premium" | "enterprise") {
  return superAdminAction(async () => {
    await db.update(schools)
      .set({ plan })
      .where(eq(schools.id, id));
    
    revalidatePath("/platform-admin");
    return { success: true };
  });
}

/**
 * Create a new school
 */
export async function createSchool(data: {
  name: string;
  slug: string;
  plan: "basic" | "premium" | "enterprise";
}) {
  return superAdminAction(async () => {
    // Check if slug already exists
    const existing = await readDb.query.schools.findFirst({
      where: eq(schools.slug, data.slug.toLowerCase()),
    });

    if (existing) {
      throw new Error("Ce nom de domaine (slug) est déjà utilisé.");
    }

    const [newSchool] = await db.insert(schools).values({
      name: data.name,
      slug: data.slug.toLowerCase(),
      plan: data.plan,
      status: "active",
      createdAt: new Date(),
    }).returning();

    revalidatePath("/platform-admin");
    return { success: true, data: newSchool };
  });
}

/**
 * Get recent audit logs across all schools
 */
export async function getGlobalAuditLogs() {
  return superAdminAction(async () => {
    return await readDb.query.auditLogs.findMany({
      with: {
        user: {
          columns: {
            nomPrenom: true,
            utilisateur: true,
          }
        },
        school: {
          columns: {
            name: true,
          }
        }
      },
      orderBy: [desc(auditLogs.timestamp)],
      limit: 50,
    });
  });
}

/**
 * Update school custom domain and sync with Vercel API
 */
export async function updateSchoolCustomDomain(id: number, customDomain: string | null) {
  return superAdminAction(async () => {
    // 1. Fetch current school state to check if customDomain is changing
    const school = await readDb.query.schools.findFirst({
      where: eq(schools.id, id),
    });

    if (!school) {
      throw new Error("École non trouvée.");
    }

    const normalizedDomain = customDomain?.trim().toLowerCase() || null;

    if (school.customDomain !== normalizedDomain) {
      // a. If there was an old domain, remove it from Vercel
      if (school.customDomain) {
        try {
          console.log(`[Platform Actions] Removing old domain from Vercel: ${school.customDomain}`);
          await removeDomainFromVercel(school.customDomain);
        } catch (err) {
          console.error(`[Platform Actions] Failed to remove domain ${school.customDomain} from Vercel:`, err);
        }
      }

      // b. If there is a new domain, add it to Vercel
      if (normalizedDomain) {
        console.log(`[Platform Actions] Adding new domain to Vercel: ${normalizedDomain}`);
        const vercelRes = await addDomainToVercel(normalizedDomain);
        if (!vercelRes.success) {
          throw new Error(`Erreur Vercel : ${vercelRes.error || "Impossible d'ajouter le domaine."}`);
        }
      }

      // c. Save to DB
      await db.update(schools)
        .set({ customDomain: normalizedDomain })
        .where(eq(schools.id, id));
    }

    revalidatePath("/platform-admin");
    return { success: true };
  });
}

/**
 * Update school name and slug
 */
export async function updateSchool(id: number, data: { name: string; slug: string }) {
  return superAdminAction(async () => {
    const existing = await readDb.query.schools.findFirst({
      where: sql`slug = ${data.slug.toLowerCase()} AND id != ${id}`,
    });

    if (existing) {
      throw new Error("Ce nom de domaine (slug) est déjà utilisé.");
    }

    await db.update(schools)
      .set({
        name: data.name,
        slug: data.slug.toLowerCase(),
      })
      .where(eq(schools.id, id));

    revalidatePath("/platform-admin");
    return { success: true };
  });
}

/**
 * Delete a school and all its associated data in proper dependency order
 */
export async function deleteSchool(id: number) {
  return superAdminAction(async () => {
    const schoolId = id;

    // Execute table cleanups in bottom-up dependency order to avoid FK constraint errors
    const cleanupQueries = [
      // 1. LMS Submissions, Progress, Virtual Attendance, Quiz Answers, Discussions
      sql`DELETE FROM lms_answers WHERE question_id IN (SELECT id FROM lms_questions WHERE quiz_id IN (SELECT id FROM lms_quizzes WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})))`,
      sql`DELETE FROM lms_questions WHERE quiz_id IN (SELECT id FROM lms_quizzes WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId}))`,
      sql`DELETE FROM lms_quizzes WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_submissions WHERE assignment_id IN (SELECT id FROM lms_assignments WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId}))`,
      sql`DELETE FROM lms_assignments WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_virtual_attendance WHERE virtual_class_id IN (SELECT id FROM lms_virtual_classes WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_virtual_classes WHERE school_id = ${schoolId}`,
      sql`DELETE FROM lms_progress WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_enrollments WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_resources WHERE module_id IN (SELECT id FROM lms_modules WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId}))`,
      sql`DELETE FROM lms_lessons WHERE module_id IN (SELECT id FROM lms_modules WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId}))`,
      sql`DELETE FROM lms_modules WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_discussions WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_certificates WHERE course_id IN (SELECT id FROM lms_courses WHERE school_id = ${schoolId})`,
      sql`DELETE FROM lms_courses WHERE school_id = ${schoolId}`,

      // 2. Exam Results, Exams, Homework, Student Results
      sql`DELETE FROM exam_results WHERE exam_id IN (SELECT id FROM exams WHERE school_id = ${schoolId}) OR student_id IN (SELECT id FROM students WHERE school_id = ${schoolId})`,
      sql`DELETE FROM student_results WHERE school_id = ${schoolId} OR student_id IN (SELECT id FROM students WHERE school_id = ${schoolId})`,
      sql`DELETE FROM homework_submissions WHERE homework_id IN (SELECT id FROM homework WHERE school_id = ${schoolId})`,
      sql`DELETE FROM homework WHERE school_id = ${schoolId}`,
      sql`DELETE FROM exams WHERE school_id = ${schoolId}`,

      // 3. Class Subjects, Section Subjects, Timetable
      sql`DELETE FROM class_subjects WHERE school_id = ${schoolId} OR class_id IN (SELECT id FROM school_classes WHERE school_id = ${schoolId})`,
      sql`DELETE FROM section_subjects WHERE section_id IN (SELECT id FROM school_sections WHERE school_id = ${schoolId})`,
      sql`DELETE FROM timetable_entries WHERE school_id = ${schoolId} OR class_id IN (SELECT id FROM school_classes WHERE school_id = ${schoolId})`,
      sql`DELETE FROM timetable_settings WHERE school_id = ${schoolId}`,
      sql`DELETE FROM teacher_constraints WHERE school_id = ${schoolId}`,

      // 4. Attendance
      sql`DELETE FROM attendance WHERE school_id = ${schoolId} OR student_id IN (SELECT id FROM students WHERE school_id = ${schoolId})`,
      sql`DELETE FROM teacher_attendance WHERE school_id = ${schoolId}`,

      // 5. Pedagogie
      sql`DELETE FROM cahier_textes WHERE school_id = ${schoolId}`,
      sql`DELETE FROM pedagogie_planifications WHERE school_id = ${schoolId}`,
      sql`DELETE FROM pedagogie_ressources WHERE school_id = ${schoolId}`,
      sql`DELETE FROM pedagogie_remediations WHERE school_id = ${schoolId}`,
      sql`DELETE FROM pedagogie_inspections WHERE school_id = ${schoolId}`,

      // 6. Finance
      sql`DELETE FROM fee_payments WHERE school_id = ${schoolId} OR student_fee_id IN (SELECT id FROM student_fees WHERE school_id = ${schoolId})`,
      sql`DELETE FROM student_fees WHERE school_id = ${schoolId} OR student_id IN (SELECT id FROM students WHERE school_id = ${schoolId})`,
      sql`DELETE FROM fee_structures WHERE school_id = ${schoolId}`,
      sql`DELETE FROM online_transactions WHERE school_id = ${schoolId}`,
      sql`DELETE FROM expenses WHERE school_id = ${schoolId}`,
      sql`DELETE FROM expense_categories WHERE school_id = ${schoolId}`,
      sql`DELETE FROM revenues WHERE school_id = ${schoolId}`,
      sql`DELETE FROM revenue_categories WHERE school_id = ${schoolId}`,
      sql`DELETE FROM salary_records WHERE school_id = ${schoolId}`,
      sql`DELETE FROM payroll_rules WHERE school_id = ${schoolId}`,
      sql`DELETE FROM financial_transactions WHERE school_id = ${schoolId}`,

      // 7. Discipline, Transport, Hostel, Library, Inventory, Front Office
      sql`DELETE FROM discipline_actions WHERE incident_id IN (SELECT id FROM discipline_incidents WHERE school_id = ${schoolId})`,
      sql`DELETE FROM discipline_incidents WHERE school_id = ${schoolId}`,
      sql`DELETE FROM transport_subscriptions WHERE school_id = ${schoolId}`,
      sql`DELETE FROM transport_routes WHERE school_id = ${schoolId}`,
      sql`DELETE FROM hostel_allocations WHERE room_id IN (SELECT id FROM hostel_rooms WHERE school_id = ${schoolId})`,
      sql`DELETE FROM hostel_rooms WHERE school_id = ${schoolId}`,
      sql`DELETE FROM library_issues WHERE book_id IN (SELECT id FROM library_books WHERE school_id = ${schoolId})`,
      sql`DELETE FROM library_books WHERE school_id = ${schoolId}`,
      sql`DELETE FROM inventory_assignments WHERE item_id IN (SELECT id FROM inventory_items WHERE school_id = ${schoolId})`,
      sql`DELETE FROM inventory_items WHERE school_id = ${schoolId}`,
      sql`DELETE FROM inventory_categories WHERE school_id = ${schoolId}`,
      sql`DELETE FROM visitor_logs WHERE school_id = ${schoolId}`,
      sql`DELETE FROM admission_enquiries WHERE school_id = ${schoolId}`,
      sql`DELETE FROM postal_dispatch WHERE school_id = ${schoolId}`,

      // 8. Messaging, Notifications, Logs
      sql`DELETE FROM message_logs WHERE school_id = ${schoolId}`,
      sql`DELETE FROM message_templates WHERE school_id = ${schoolId}`,
      sql`DELETE FROM scheduled_messages WHERE school_id = ${schoolId}`,
      sql`DELETE FROM notifications WHERE school_id = ${schoolId}`,
      sql`DELETE FROM audit_logs WHERE school_id = ${schoolId}`,
      sql`DELETE FROM system_logs WHERE school_id = ${schoolId}`,

      // 9. Subscriptions, Branches, Settings
      sql`DELETE FROM school_subscriptions WHERE school_id = ${schoolId}`,
      sql`DELETE FROM school_branches WHERE school_id = ${schoolId}`,
      sql`DELETE FROM settings WHERE school_id = ${schoolId}`,

      // 10. Academic Core (Classes, Sections, Subjects, Periods, Sessions, Levels)
      sql`DELETE FROM school_classes WHERE school_id = ${schoolId}`,
      sql`DELETE FROM school_sections WHERE school_id = ${schoolId}`,
      sql`DELETE FROM school_subjects WHERE school_id = ${schoolId}`,
      sql`DELETE FROM academic_periods WHERE school_id = ${schoolId}`,
      sql`DELETE FROM school_sessions WHERE school_id = ${schoolId}`,
      sql`DELETE FROM educational_levels WHERE school_id = ${schoolId}`,

      // 11. Parent Links, Students, Employees, Users
      sql`DELETE FROM parent_students WHERE student_id IN (SELECT id FROM students WHERE school_id = ${schoolId})`,
      sql`DELETE FROM parent_profiles WHERE user_id IN (SELECT id FROM users WHERE school_id = ${schoolId})`,
      sql`DELETE FROM students WHERE school_id = ${schoolId}`,
      sql`DELETE FROM employee_attendance WHERE employee_id IN (SELECT id FROM employees WHERE school_id = ${schoolId})`,
      sql`DELETE FROM employees WHERE school_id = ${schoolId}`,
      sql`DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE school_id = ${schoolId})`,
      sql`DELETE FROM users WHERE school_id = ${schoolId}`,

      // 12. Finally, Schools table!
      sql`DELETE FROM schools WHERE id = ${schoolId}`
    ];

    for (const query of cleanupQueries) {
      try {
        await db.execute(query);
      } catch (err) {
        console.warn(`[deleteSchool] Non-fatal deletion warning for step:`, err);
      }
    }

    revalidatePath("/platform-admin");
    return { success: true };
  });
}

import { generateLicenseKey, PLAN_MATRIX, SubscriptionPlan } from "../services/tenant-licensing.service";

/**
 * Generate & assign an instant cryptographic license key to a school (Super Admin)
 */
export async function generateAndAssignSchoolLicense(
  schoolId: number,
  plan: SubscriptionPlan,
  durationMonths: number = 12
) {
  return superAdminAction(async () => {
    const key = generateLicenseKey(plan, durationMonths);
    const validityDays = durationMonths * 30;
    
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + validityDays);

    await db.update(schools)
      .set({
        plan,
        status: "active",
        subscriptionExpiry: newExpiry,
        licenseKey: key,
      })
      .where(eq(schools.id, schoolId));

    // Audit log entry
    try {
      await db.insert(auditLogs).values({
        action: "GENERATE_LICENSE",
        tableName: "schools",
        recordId: schoolId.toString(),
        newData: JSON.stringify({ plan, durationMonths, licenseKey: key, expiry: newExpiry }),
        schoolId,
      });
    } catch (err) {
      console.warn("Non-fatal audit log error:", err);
    }

    revalidatePath("/platform-admin");
    revalidatePath("/dashboard/super-admin");
    revalidatePath("/dashboard/subscription");

    return {
      success: true,
      licenseKey: key,
      plan,
      expiry: newExpiry,
      message: `Licence ${plan.toUpperCase()} générée et assignée avec succès (${key}).`,
    };
  });
}

/**
 * Detailed Usage Summary per School to monitor and enforce Supabase Free Plan limits
 */
export async function getSchoolUsageSummary() {
  return superAdminAction(async () => {
    // 1. Fetch all schools
    const allSchools = await readDb.select().from(schools).orderBy(desc(schools.createdAt));

    // 2. Fetch student count grouped by schoolId
    const studentCounts = await readDb
      .select({
        schoolId: students.schoolId,
        count: count(),
      })
      .from(students)
      .groupBy(students.schoolId);

    // 3. Fetch user count grouped by schoolId
    const userCounts = await readDb
      .select({
        schoolId: users.schoolId,
        count: count(),
      })
      .from(users)
      .groupBy(users.schoolId);

    // 4. Fetch sync audit logs / operations count grouped by schoolId
    const syncOpCounts = await readDb
      .select({
        schoolId: auditLogs.schoolId,
        count: count(),
      })
      .from(auditLogs)
      .groupBy(auditLogs.schoolId);

    const studentMap = new Map(studentCounts.map((s) => [s.schoolId, Number(s.count)]));
    const userMap = new Map(userCounts.map((u) => [u.schoolId, Number(u.count)]));
    const syncMap = new Map(syncOpCounts.map((s) => [s.schoolId, Number(s.count)]));

    const totalStudents = studentCounts.reduce((acc, curr) => acc + Number(curr.count), 0);
    const totalUsers = userCounts.reduce((acc, curr) => acc + Number(curr.count), 0);
    const totalSyncs = syncOpCounts.reduce((acc, curr) => acc + Number(curr.count), 0);

    const schoolsUsage = allSchools.map((s) => {
      const studentsCount = studentMap.get(s.id) || 0;
      const usersCount = userMap.get(s.id) || 0;
      const syncOpsCount = syncMap.get(s.id) || 0;

      // Estimated DB usage: ~1.5 KB per student, ~2 KB per user, ~0.5 KB per audit record
      const estimatedDbMb = Number(
        (((studentsCount * 1.5 + usersCount * 2 + syncOpsCount * 0.5) / 1024) + 0.05).toFixed(2)
      );

      const maxStudents = s.maxStudents || 500;
      const maxStorageMb = s.maxStorageMb || 100;
      const maxMonthlySyncOps = s.maxMonthlySyncOps || 5000;

      const studentUsagePercent = Math.min(100, Math.round((studentsCount / maxStudents) * 100));
      const storageUsagePercent = Math.min(100, Math.round((estimatedDbMb / maxStorageMb) * 100));
      const syncUsagePercent = Math.min(100, Math.round((syncOpsCount / maxMonthlySyncOps) * 100));

      const isQuotaExceeded =
        studentsCount > maxStudents ||
        estimatedDbMb > maxStorageMb ||
        syncOpsCount > maxMonthlySyncOps;

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        plan: s.plan || "basic",
        status: s.status || "active",
        studentsCount,
        maxStudents,
        studentUsagePercent,
        usersCount,
        syncOpsCount,
        maxMonthlySyncOps,
        syncUsagePercent,
        estimatedDbMb,
        maxStorageMb,
        storageUsagePercent,
        isQuotaExceeded,
      };
    });

    return {
      global: {
        totalSchools: allSchools.length,
        totalStudents,
        totalUsers,
        totalSyncs,
        // Supabase Free Tier Max Limits:
        supabaseDbMaxMb: 500, // 0.5 GB
        supabaseStorageMaxMb: 1000, // 1 GB
        supabaseEgressMaxGb: 5, // 5 GB
        supabaseMauMax: 50000,
      },
      schoolsUsage,
    };
  });
}

/**
 * Update Quota Limits for a specific school
 */
export async function updateSchoolQuotas(
  schoolId: number,
  quotas: {
    maxStudents?: number;
    maxStorageMb?: number;
    maxMonthlySyncOps?: number;
  }
) {
  return superAdminAction(async () => {
    await db
      .update(schools)
      .set({
        maxStudents: quotas.maxStudents,
        maxStorageMb: quotas.maxStorageMb,
        maxMonthlySyncOps: quotas.maxMonthlySyncOps,
      })
      .where(eq(schools.id, schoolId));

    revalidatePath("/platform-admin");
    return { success: true };
  });
}


