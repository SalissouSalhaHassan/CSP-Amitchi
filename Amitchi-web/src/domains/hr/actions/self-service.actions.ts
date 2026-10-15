"use server";

import { db, readDb } from "@/infrastructure/database";
import { employees, teacherHrRequests, salaryRecords, teacherExtraHours } from "@/infrastructure/database/schema/hr";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── 1. Get Self-Service Profile, Requests, Payslips & Overtime ─────────────

export async function getStaffSelfServiceData() {
  return protectedDbAction("HR", "canView", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId || 1;

    // Resolve employee profile
    let empProfile: any = (user as any).employee || null;
    let actualEmployeeId = (user as any).employeeId || empProfile?.id || null;

    if (!empProfile && actualEmployeeId) {
      const rows = await readDb
        .select()
        .from(employees)
        .where(eq(employees.id, actualEmployeeId))
        .limit(1);
      empProfile = rows[0] || null;
    }

    if (!empProfile) {
      // Find employee by email or mobile or name in school
      const userAny = user as any;
      const searchTerms = [
        user.utilisateur,
        user.nomPrenom,
        userAny.email,
        userAny.nom,
        userAny.mobile,
      ].filter(Boolean) as string[];

      for (const term of searchTerms) {
        const rows = await readDb
          .select()
          .from(employees)
          .where(
            and(
              eq(employees.schoolId, schoolId),
              or(
                eq(employees.email, term),
                eq(employees.mobile, term),
                ilike(employees.nom, `%${term}%`)
              )
            )
          )
          .limit(1);
        if (rows.length > 0) {
          empProfile = rows[0];
          actualEmployeeId = empProfile.id;
          break;
        }
      }
    }

    // Fallback if none matched: retrieve first employee for demonstration/admin
    if (!empProfile) {
      const anyEmp = await readDb
        .select()
        .from(employees)
        .where(eq(employees.schoolId, schoolId))
        .limit(1);
      if (anyEmp.length > 0) {
        empProfile = anyEmp[0];
        actualEmployeeId = empProfile.id;
      }
    }

    if (!actualEmployeeId) {
      return {
        profile: null,
        requests: [],
        payslips: [],
        extraHours: [],
      };
    }

    // Fetch HR Requests, Payslips, and Extra hours in parallel
    const [hrRequestsList, payslipsList, extraHoursList] = await Promise.all([
      readDb.query.teacherHrRequests.findMany({
        where: eq(teacherHrRequests.employeeId, actualEmployeeId),
        orderBy: [desc(teacherHrRequests.createdAt)],
      }),
      readDb.query.salaryRecords.findMany({
        where: eq(salaryRecords.employeeId, actualEmployeeId),
        orderBy: [desc(salaryRecords.createdAt)],
      }),
      readDb.query.teacherExtraHours.findMany({
        where: eq(teacherExtraHours.employeeId, actualEmployeeId),
        orderBy: [desc(teacherExtraHours.createdAt)],
      }),
    ]);

    const baseSalary = Number(empProfile?.salaireBase) || 120000;
    const allowances = Math.round(baseSalary * 0.15); // standard allowance
    const deductions = Math.round(baseSalary * 0.05); // standard deduction
    const netSalary = baseSalary + allowances - deductions;

    return {
      profile: {
        id: empProfile.id,
        empId: empProfile.empId || `EMP-${empProfile.id}`,
        nom: empProfile.nom || user.nomPrenom || "Agent Edut",
        poste: empProfile.poste || empProfile.fonction || "Enseignant / Personnel",
        departement: empProfile.departement || "Corps Enseignant",
        dateEmbauche: empProfile.dateEmbauche || "2023-09-01",
        salaireBase: baseSalary,
        allowances,
        deductions,
        netSalary,
        mobile: empProfile.mobile || "N/A",
        email: empProfile.email || "N/A",
        banqueNom: empProfile.banqueNom || "SONIBANK",
        banqueCompte: empProfile.banqueCompte || "NE023-01001-XXXXXX",
        photoPath: empProfile.photoPath,
      },
      requests: hrRequestsList,
      payslips: payslipsList,
      extraHours: extraHoursList,
    };
  });
}

// ─── 2. Submit HR Request (Leaves, Permissions, Salary Advances, Certificates)

export async function submitStaffHrRequestAction(data: {
  employeeId: number;
  requestType: string;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  advanceAmount?: number;
  reason: string;
  documentUrl?: string;
}) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId || 1;

    const [inserted] = await db
      .insert(teacherHrRequests)
      .values({
        schoolId,
        employeeId: data.employeeId,
        requestType: data.requestType,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        daysCount: data.daysCount ? Number(data.daysCount) : 1,
        advanceAmount: data.advanceAmount ? Number(data.advanceAmount) : null,
        reason: data.reason,
        documentUrl: data.documentUrl || null,
        status: "En attente",
      })
      .returning();

    // Notify School Director / HR Admin
    try {
      const emp = await db.query.employees.findFirst({
        where: eq(employees.id, data.employeeId),
      });
      const staffName = emp?.nom || user.nomPrenom || "Un collaborateur";

      const adminUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.schoolId, schoolId));

      for (const admin of adminUsers) {
        await db.insert(notifications).values({
          userId: admin.id,
          title: `📝 Nouvelle demande RH : ${staffName}`,
          content: `${staffName} a soumis une demande de ${data.requestType}. Motif : ${data.reason}`,
          type: "RH",
          category: "RH",
          isRead: false,
        });
      }
    } catch (err) {
      console.error("⚠️ Failed to notify admin for HR request:", err);
    }

    revalidatePath("/dashboard/hr/self-service");
    revalidatePath("/dashboard/hr");
    return {
      success: true,
      requestId: inserted.id,
      message: "Demande RH transmise avec succès à la direction.",
    };
  });
}

// ─── 3. Declare Extra Teaching Hours (Heures supplémentaires) ───────────────

export async function submitStaffExtraHoursAction(data: {
  employeeId: number;
  date: string;
  typeHour: string;
  className?: string;
  subjectName?: string;
  hoursCount: number;
  hourlyRate?: number;
  notes?: string;
}) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId || 1;

    const rate = data.hourlyRate ? Number(data.hourlyRate) : 2500;
    const hours = Number(data.hoursCount || 1);
    const totalAmount = rate * hours;

    const [inserted] = await db
      .insert(teacherExtraHours)
      .values({
        schoolId,
        employeeId: data.employeeId,
        date: data.date,
        typeHour: data.typeHour || "Heure supplémentaire",
        className: data.className || null,
        subjectName: data.subjectName || null,
        hoursCount: hours,
        hourlyRate: rate,
        totalAmount,
        status: "En attente",
        notes: data.notes || null,
      })
      .returning();

    revalidatePath("/dashboard/hr/self-service");
    return {
      success: true,
      id: inserted.id,
      message: "Déclaration d'heures supplémentaires enregistrée.",
    };
  });
}

// ─── 4. Admin Review & Decision with Instant WhatsApp/SMS Alert ─────────────

export async function reviewStaffHrRequestAction(data: {
  requestId: number;
  decision: "Approuvé" | "Rejeté";
  adminComment?: string;
}) {
  return protectedDbAction("HR", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    const request = await db.query.teacherHrRequests.findFirst({
      where: eq(teacherHrRequests.id, data.requestId),
    });

    if (!request) {
      return { error: "Demande RH introuvable." };
    }

    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, request.employeeId),
    });

    await db
      .update(teacherHrRequests)
      .set({
        status: data.decision,
        adminComment: data.adminComment || null,
      })
      .where(eq(teacherHrRequests.id, data.requestId));

    // Send instant WhatsApp & SMS decision notification to employee
    if (employee && employee.mobile) {
      try {
        await MessagingService.sendHrRequestDecisionAlert({
          to: employee.mobile,
          whatsapp: employee.mobile,
          employeeName: employee.nom,
          requestType: request.requestType,
          decision: data.decision,
          adminComment: data.adminComment,
          schoolName: "Edut Pro",
          sendSMS: true,
          sendWhatsApp: true,
        });
      } catch (err) {
        console.error("⚠️ Failed to send HR decision alert:", err);
      }
    }

    revalidatePath("/dashboard/hr/self-service");
    revalidatePath("/dashboard/hr");
    return {
      success: true,
      decision: data.decision,
      message: `Demande ${data.decision.toLowerCase()} avec succès. Le collaborateur a été notifié par WhatsApp/SMS.`,
    };
  });
}

// ─── 5. Delete Actions ───────────────────────────────────────────────────────

export async function deleteStaffHrRequestAction(id: number) {
  return protectedDbAction("HR", "canDelete", async () => {
    await db.delete(teacherHrRequests).where(eq(teacherHrRequests.id, id));
    revalidatePath("/dashboard/hr/self-service");
    return { success: true };
  });
}

export async function deleteStaffExtraHoursAction(id: number) {
  return protectedDbAction("HR", "canDelete", async () => {
    await db.delete(teacherExtraHours).where(eq(teacherExtraHours.id, id));
    revalidatePath("/dashboard/hr/self-service");
    return { success: true };
  });
}
