"use server";

import { db } from "@/infrastructure/database";
import { employees, salaryRecords, payrollRules, employeeAttendance } from "@/infrastructure/database/schema/hr";
import { eq, desc, and, or, isNull, sql, sum, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

// ── Payroll Rules ─────────────────────────────────────────────────────
export async function getPayrollRules() {
  return protectedDbAction("HR", "canView", async () => {
    let rules = await db.query.payrollRules.findFirst();
    if (!rules) {
      // Create default rules
      const [created] = await db.insert(payrollRules).values({}).returning();
      rules = created;
    }
    return { data: rules };
  });
}

export async function savePayrollRules(data: {
  leaveAllowPerMonth: number;
  latePenalty: number;
  halfDayPenalty: number;
}) {
  return protectedDbAction("HR", "canEdit", async () => {
    const existing = await db.query.payrollRules.findFirst();
    if (existing) {
      await db.update(payrollRules).set(data).where(eq(payrollRules.id, existing.id));
    } else {
      await db.insert(payrollRules).values(data);
    }
    return { success: true };
  });
}

// ── Dashboard Stats ───────────────────────────────────────────────────
export async function getPayrollDashboard() {
  return protectedDbAction("HR", "canView", async (user) => {
    const schoolId = user?.schoolId || (await getActiveSchoolId()) || 1;
    const now = new Date();
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    const currentMonthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;

    const schoolEmpWhere = or(eq(employees.schoolId, schoolId), isNull(employees.schoolId));

    // Get school employee IDs to scope salary records
    const schoolEmployees = await db.select({ id: employees.id })
      .from(employees)
      .where(schoolEmpWhere);
    const empIds = schoolEmployees.map(e => e.id);

    const [activeEmps, paidSum, unpaidSum, recentRecords] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(and(schoolEmpWhere, eq(employees.statut, "Actif"))),
      empIds.length > 0
        ? db.select({ total: sum(salaryRecords.netSalary) })
            .from(salaryRecords)
            .where(and(
              inArray(salaryRecords.employeeId, empIds),
              eq(salaryRecords.monthYear, currentMonthYear),
              eq(salaryRecords.status, "Paid")
            ))
        : Promise.resolve([{ total: 0 }]),
      empIds.length > 0
        ? db.select({ total: sum(salaryRecords.netSalary) })
            .from(salaryRecords)
            .where(and(
              inArray(salaryRecords.employeeId, empIds),
              eq(salaryRecords.status, "Unpaid")
            ))
        : Promise.resolve([{ total: 0 }]),
      empIds.length > 0
        ? db.query.salaryRecords.findMany({
            where: inArray(salaryRecords.employeeId, empIds),
            orderBy: [desc(salaryRecords.id)],
            limit: 10,
            with: { employee: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      data: {
        activeEmployees: Number(activeEmps[0]?.count || 0),
        paidThisMonth: Number(paidSum[0]?.total || 0),
        totalUnpaid: Number(unpaidSum[0]?.total || 0),
        currentMonthYear,
        recentRecords: recentRecords.map(r => ({
          id: r.id,
          employeeName: (r as any).employee?.nom || "Inconnu",
          monthYear: r.monthYear,
          netSalary: r.netSalary,
          status: r.status,
          paymentDate: r.paymentDate,
        })),
      }
    };
  });
}

// ── Salary Records CRUD ───────────────────────────────────────────────
export async function getSalaryRecords(employeeId?: number, monthYear?: string) {
  return protectedDbAction("HR", "canView", async () => {
    const conditions = [];
    if (employeeId) conditions.push(eq(salaryRecords.employeeId, employeeId));
    if (monthYear) conditions.push(eq(salaryRecords.monthYear, monthYear));

    const data = await db.query.salaryRecords.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(salaryRecords.id)],
      with: { employee: true },
    });
    return { data };
  });
}

export async function createSalaryRecord(record: {
  employeeId: number;
  monthYear: string;
  absentDays?: number;
  leaveTaken?: number;
  lateDays?: number;
  basicSalary: number;
  calculatedBasic: number;
  totalAllowance?: number;
  totalDeduction?: number;
  netSalary: number;
  status: "Paid" | "Unpaid";
  paymentMode?: string;
  remark?: string;
}) {
  return protectedDbAction("HR", "canEdit", async () => {
    const [created] = await db.insert(salaryRecords).values({
      ...record,
      paymentDate: record.status === "Paid" ? new Date() : undefined,
    }).returning();
    revalidatePath("/dashboard/hr/payroll");
    return { success: true, data: created };
  });
}

export async function markSalaryAsPaid(id: number) {
  return protectedDbAction("HR", "canEdit", async () => {
    await db.update(salaryRecords)
      .set({ status: "Paid", paymentDate: new Date(), paymentMode: "Virement" })
      .where(eq(salaryRecords.id, id));
    revalidatePath("/dashboard/hr/payroll");
    return { success: true };
  });
}

export async function deleteSalaryRecord(id: number) {
  return protectedDbAction("HR", "canDelete", async () => {
    await db.delete(salaryRecords).where(eq(salaryRecords.id, id));
    revalidatePath("/dashboard/hr/payroll");
    return { success: true };
  });
}

// ── Employee Attendance Summary for Payroll Calc ──────────────────────
export async function getEmployeeAttendanceSummary(employeeId: number, monthYear: string) {
  return protectedDbAction("HR", "canView", async () => {
    // Parse month/year from French month name
    const months: Record<string, number> = {
      "Janvier":1,"Février":2,"Mars":3,"Avril":4,"Mai":5,"Juin":6,
      "Juillet":7,"Août":8,"Septembre":9,"Octobre":10,"Novembre":11,"Décembre":12
    };
    const parts = monthYear.split(" ");
    const monthNum = months[parts[0]] || 1;
    const year = parseInt(parts[1] || new Date().getFullYear().toString());
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const records = await db.select({
      status: employeeAttendance.status,
      count: sql<number>`count(*)`,
    })
    .from(employeeAttendance)
    .where(
      and(
        eq(employeeAttendance.employeeId, employeeId),
        sql`${employeeAttendance.date} >= ${startDate.toISOString()}`,
        sql`${employeeAttendance.date} < ${endDate.toISOString()}`
      )
    )
    .groupBy(employeeAttendance.status);

    const summary: Record<string, number> = {};
    records.forEach(r => { summary[r.status || ""] = Number(r.count); });

    return {
      data: {
        presents: summary["Présent"] || 0,
        absents: summary["Absent"] || 0,
        conges: summary["Congé"] || 0,
        retards: summary["En Retard"] || 0,
      }
    };
  });
}
