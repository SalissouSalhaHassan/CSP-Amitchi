"use server";

import { db } from "@/infrastructure/database";
import { employees, employeeAttendance } from "@/infrastructure/database/schema/hr";
import { eq, desc, and, sql, inArray, or, isNull, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { employeeSchema, EmployeeFormData } from "../validators/employee.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType, getCompatibleLevels, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";

export async function getEmployees(params?: {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  role?: string;
}) {
  return protectedDbAction("HR", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user?.schoolId || 1;
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { data: [] };
    }

    let whereClause = (schoolId ? or(eq(employees.schoolId, schoolId), isNull(employees.schoolId)) : sql`TRUE`) as any;

    if ((roleType === "level_director" || roleType === "level_comptable") && user.educationalLevel) {
      if (!["tous", "all", "tous les niveaux"].includes(user.educationalLevel.toLowerCase())) {
        const compatibleLevels = getCompatibleLevels(user.educationalLevel);
        whereClause = and(
          whereClause,
          or(
            inArray(employees.educationalLevel, compatibleLevels),
            sql`string_to_array(${employees.educationalLevel}, ',') && ${compatibleLevels}::text[]`
          )
        ) as any;
      }
    }

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      whereClause = and(
        whereClause,
        or(
          ilike(employees.nom, q),
          ilike(employees.empId, q),
          ilike(employees.email, q),
          ilike(employees.mobile, q),
          ilike(employees.poste, q),
          ilike(employees.fonction, q)
        )
      ) as any;
    }

    const isPaginated = typeof params?.page === "number" || typeof params?.limit === "number";
    const limit = params?.limit ? Math.min(Math.max(1, params.limit), 100) : (isPaginated ? 25 : undefined);
    const page = Math.max(1, params?.page || 1);
    const offset = limit ? (page - 1) * limit : undefined;

    let totalCount = 0;
    if (isPaginated) {
      const countRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(whereClause);
      totalCount = Number(countRes[0]?.count || 0);
    }

    const data = await db.query.employees.findMany({
      where: whereClause,
      columns: {
        id: true,
        schoolId: true,
        empId: true,
        nom: true,
        poste: true,
        departement: true,
        fonction: true,
        mobile: true,
        email: true,
        statut: true,
        educationalLevel: true,
        photoPath: true,
        dateEmbauche: true,
        createdAt: true,
      },
      orderBy: [desc(employees.createdAt)],
      limit: limit,
      offset: offset,
    });

    return { 
      data,
      total: isPaginated ? totalCount : data.length,
      page: isPaginated ? page : 1,
      limit: limit || data.length,
      totalPages: isPaginated && limit ? Math.ceil(totalCount / limit) : 1
    };
  });
}

export async function createEmployee(formData: EmployeeFormData) {
  const validation = employeeSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const employeeData: any = {
      ...validation.data,
      schoolId: schoolId
    };

    if (roleType === "level_director") {
      employeeData.educationalLevel = user.educationalLevel;
    }

    await db.insert(employees).values(employeeData);
    revalidatePath("/dashboard/hr");
    return { success: true };
  });
}

export async function deleteEmployee(id: number) {
  return protectedDbAction("HR", "canDelete", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    if (roleType === "level_director") {
      const targetEmp = await db.query.employees.findFirst({
        where: and(eq(employees.id, id), eq(employees.schoolId, schoolId))
      });
      if (!targetEmp || !checkEducationalLevelAccess(user, targetEmp.educationalLevel)) {
        return { error: "Accès refusé. Ce membre du personnel appartient à un autre secteur." };
      }
    }

    await db.delete(employees).where(
      and(
        eq(employees.id, id),
        eq(employees.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/hr");
    return { success: true };
  });
}

export async function updateEmployee(id: number, formData: EmployeeFormData) {
  const validation = employeeSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    if (roleType === "level_director") {
      const targetEmp = await db.query.employees.findFirst({
        where: and(eq(employees.id, id), eq(employees.schoolId, schoolId))
      });
      if (!targetEmp || !checkEducationalLevelAccess(user, targetEmp.educationalLevel)) {
        return { error: "Accès refusé. Ce membre du personnel appartient à un autre secteur." };
      }
    }

    await db.update(employees)
      .set(validation.data)
      .where(
        and(
          eq(employees.id, id),
          eq(employees.schoolId, schoolId)
        )
      );
    revalidatePath("/dashboard/hr");
    return { success: true };
  });
}

export async function getEmployeeAttendance(dateStr: string) {
  return protectedDbAction("HR", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { data: [] };
    }

    const targetDate = new Date(dateStr);
    
    // Filter by level director's level
    let empWhere = eq(employees.schoolId, schoolId);
    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      empWhere = and(
        empWhere,
        or(
          inArray(employees.educationalLevel, compatibleLevels),
          isNull(employees.educationalLevel),
          sql`string_to_array(${employees.educationalLevel}, ',') && ${compatibleLevels}::text[]`
        )
      ) as any;
    }

    const matchedEmployees = await db.query.employees.findMany({
      where: empWhere,
      columns: { id: true }
    });

    if (matchedEmployees.length === 0) return { data: [] };
    const empIds = matchedEmployees.map(e => e.id);

    const data = await db.query.employeeAttendance.findMany({
      where: and(
        inArray(employeeAttendance.employeeId, empIds),
        sql`DATE(${employeeAttendance.date}) = DATE(${targetDate.toISOString()})`
      )
    });
    return { data };
  });
}

export async function saveEmployeeAttendance(
  records: Array<{ employeeId: number; status: string; periodNumber?: number; remarques?: string }>,
  dateStr: string
) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const targetDate = new Date(dateStr);
    
    // Verify level access for all records if level director
    if (roleType === "level_director") {
      const targetEmpIds = records.map(r => r.employeeId);
      const targetEmployees = await db.query.employees.findMany({
        where: and(inArray(employees.id, targetEmpIds), eq(employees.schoolId, schoolId))
      });

      const allAccess = targetEmployees.every(emp => checkEducationalLevelAccess(user, emp.educationalLevel));
      if (!allAccess) {
        return { error: "Accès refusé. Certains employés appartiennent à un autre secteur." };
      }
    }

    // Fetch existing attendance records for the target date
    const existing = await db.query.employeeAttendance.findMany({
      where: sql`DATE(${employeeAttendance.date}) = DATE(${targetDate.toISOString()})`
    });

    const existingMap = new Map(existing.map(r => [r.employeeId, r.id]));

    await Promise.all(
      records.map(async (record) => {
        const existingId = existingMap.get(record.employeeId);
        if (existingId) {
          await db.update(employeeAttendance)
            .set({
              status: record.status,
              periodNumber: record.periodNumber || 1,
              remarques: record.remarques || "",
            })
            .where(eq(employeeAttendance.id, existingId));
        } else {
          await db.insert(employeeAttendance).values({
            employeeId: record.employeeId,
            date: targetDate,
            status: record.status,
            periodNumber: record.periodNumber || 1,
            remarques: record.remarques || "",
          });
        }
      })
    );

    revalidatePath("/dashboard/hr");
    revalidatePath("/dashboard/hr/attendance");
    return { success: true };
  });
}
