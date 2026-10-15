"use server";

import { db } from "@/infrastructure/database";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { cahierTextes, pedagogiePlanification, pedagogieRemediation } from "@/infrastructure/database/schema/pedagogie";
import { studentResults, schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { studentAttendance, teacherSessionAttendance } from "@/infrastructure/database/schema/attendance";
import { lmsAssignments, lmsSubmissions } from "@/infrastructure/database/schema/lms";
import { employees } from "@/infrastructure/database/schema/hr";
import { students } from "@/infrastructure/database/schema/students";
import { and, eq, gte, lte, sql, or } from "drizzle-orm";
import { getPedagogieScope } from "@/domains/pedagogie/permissions";
import { PedagogicalDataService, PedagogicalFilters } from "../services/pedagogical-data.service";

const startOfDay = (date: Date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const percent = (value: number, total: number) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

export async function getPedagogieOverview() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: null };

    const scope = getPedagogieScope(user);
    if (scope.role === "guest") {
      return { success: false, error: "Accès non autorisé", data: null };
    }

    const schoolId = await getActiveSchoolId();
    const today = startOfDay(new Date());
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Build conditions for teacher filter
    const isTeach = scope.role === "enseignant" && scope.teacherId;

    const [
      totalClassesRows,
      totalSubjectsRows,
      totalStudentsRows,
      totalTeachersRows,
      plansRows,
      realisedRows,
      activeAssignmentsRows,
      overdueAssignmentsRows,
      pendingSubmissionsRows,
      gradedSubmissionsRows,
      averageResultsRows,
      weakStudentsRows,
      attendanceRows,
      teacherAttendanceRows,
      remediationRows,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(schoolClasses).where(eq(schoolClasses.schoolId, schoolId)),
      db.select({ count: sql<number>`count(*)::int` }).from(schoolSubjects).where(eq(schoolSubjects.schoolId, schoolId)),
      db.select({ count: sql<number>`count(*)::int` }).from(students).where(eq(students.schoolId, schoolId)),
      db.select({ count: sql<number>`count(*)::int` }).from(employees).where(eq(employees.schoolId, schoolId)),
      
      db.select({ count: sql<number>`count(*)::int` })
        .from(pedagogiePlanification)
        .where(
          and(
            eq(pedagogiePlanification.schoolId, schoolId),
            isTeach ? eq(pedagogiePlanification.employeeId, scope.teacherId!) : undefined
          )
        ),

      db.select({ count: sql<number>`count(*)::int` })
        .from(cahierTextes)
        .where(
          and(
            eq(cahierTextes.schoolId, schoolId),
            isTeach ? eq(cahierTextes.employeeId, scope.teacherId!) : undefined
          )
        ),

      db.select({ count: sql<number>`count(*)::int` })
        .from(lmsAssignments)
        .leftJoin(schoolClasses, eq(lmsAssignments.classId, schoolClasses.id))
        .where(
          and(
            eq(schoolClasses.schoolId, schoolId),
            eq(lmsAssignments.status, "Active")
          )
        ),

      db.select({ count: sql<number>`count(*)::int` })
        .from(lmsAssignments)
        .leftJoin(schoolClasses, eq(lmsAssignments.classId, schoolClasses.id))
        .where(
          and(
            eq(schoolClasses.schoolId, schoolId),
            lte(lmsAssignments.dueDate, today),
            eq(lmsAssignments.status, "Active")
          )
        ),

      db.select({ count: sql<number>`count(*)::int` })
        .from(lmsSubmissions)
        .leftJoin(lmsAssignments, eq(lmsSubmissions.assignmentId, lmsAssignments.id))
        .leftJoin(schoolClasses, eq(lmsAssignments.classId, schoolClasses.id))
        .where(
          and(
            eq(schoolClasses.schoolId, schoolId),
            eq(lmsSubmissions.isGraded, false)
          )
        ),

      db.select({
          count: sql<number>`count(*)::int`,
          average: sql<number>`coalesce(avg(${lmsSubmissions.score}), 0)::float`,
        })
        .from(lmsSubmissions)
        .leftJoin(lmsAssignments, eq(lmsSubmissions.assignmentId, lmsAssignments.id))
        .leftJoin(schoolClasses, eq(lmsAssignments.classId, schoolClasses.id))
        .where(
          and(
            eq(schoolClasses.schoolId, schoolId),
            eq(lmsSubmissions.isGraded, true)
          )
        ),

      db.select({
          count: sql<number>`count(*)::int`,
          average: sql<number>`coalesce(avg(${studentResults.totalScore}), 0)::float`,
        })
        .from(studentResults)
        .leftJoin(schoolClasses, eq(studentResults.classId, schoolClasses.id))
        .where(eq(schoolClasses.schoolId, schoolId)),

      db.select({ count: sql<number>`count(distinct ${studentResults.studentId})::int` })
        .from(studentResults)
        .leftJoin(schoolClasses, eq(studentResults.classId, schoolClasses.id))
        .where(and(eq(schoolClasses.schoolId, schoolId), lte(studentResults.totalScore, 10))),

      db.select({
          total: sql<number>`count(*)::int`,
          presents: sql<number>`sum(case when lower(${studentAttendance.status}) like 'pr%' or lower(${studentAttendance.status}) = 'present' then 1 else 0 end)::int`,
        })
        .from(studentAttendance)
        .leftJoin(schoolClasses, eq(studentAttendance.classId, schoolClasses.id))
        .where(and(eq(schoolClasses.schoolId, schoolId), gte(studentAttendance.date, today))),

      db.select({
          total: sql<number>`count(*)::int`,
          presents: sql<number>`sum(case when lower(${teacherSessionAttendance.status}) like 'pr%' or lower(${teacherSessionAttendance.status}) = 'present' then 1 else 0 end)::int`,
        })
        .from(teacherSessionAttendance)
        .where(and(eq(teacherSessionAttendance.schoolId, schoolId), gte(teacherSessionAttendance.date, today))),

      db.select({ count: sql<number>`count(*)::int` })
        .from(pedagogieRemediation)
        .where(
          and(
            eq(pedagogieRemediation.schoolId, schoolId),
            isTeach ? eq(pedagogieRemediation.employeeId, scope.teacherId!) : undefined
          )
        ),
    ]);

    const plannedLessons = Number(plansRows[0]?.count || 0);
    const realisedLessons = Number(realisedRows[0]?.count || 0);
    const activeAssignments = Number(activeAssignmentsRows[0]?.count || 0);
    const overdueAssignments = Number(overdueAssignmentsRows[0]?.count || 0);
    const pendingCorrections = Number(pendingSubmissionsRows[0]?.count || 0);
    const weakStudents = Number(weakStudentsRows[0]?.count || 0);
    const remediationPlans = Number(remediationRows[0]?.count || 0);

    const attendanceTotal = Number(attendanceRows[0]?.total || 0);
    const attendancePresent = Number(attendanceRows[0]?.presents || 0);
    const teacherAttendanceTotal = Number(teacherAttendanceRows[0]?.total || 0);
    const teacherAttendancePresent = Number(teacherAttendanceRows[0]?.presents || 0);

    return {
      success: true,
      data: {
        totals: {
          classes: Number(totalClassesRows[0]?.count || 0),
          subjects: Number(totalSubjectsRows[0]?.count || 0),
          students: Number(totalStudentsRows[0]?.count || 0),
          teachers: Number(totalTeachersRows[0]?.count || 0),
        },
        planning: {
          plannedLessons,
          realisedLessons,
          progressRate: percent(realisedLessons, plannedLessons),
        },
        assignments: {
          active: activeAssignments,
          overdue: overdueAssignments,
          pendingCorrections,
          graded: Number(gradedSubmissionsRows[0]?.count || 0),
          averageScore: Math.round(Number(gradedSubmissionsRows[0]?.average || 0) * 10) / 10,
        },
        results: {
          records: Number(averageResultsRows[0]?.count || 0),
          averageScore: Math.round(Number(averageResultsRows[0]?.average || 0) * 10) / 10,
          weakStudents,
        },
        attendance: {
          studentRate: percent(attendancePresent, attendanceTotal),
          teacherRate: percent(teacherAttendancePresent, teacherAttendanceTotal),
          studentRecordsToday: attendanceTotal,
          teacherRecordsToday: teacherAttendanceTotal,
        },
        remediation: {
          activePlans: remediationPlans,
        },
        alerts: {
          total: overdueAssignments + pendingCorrections + weakStudents + Math.max(0, plannedLessons - realisedLessons),
        },
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}

export async function getPedagogieClassOverview() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const scope = getPedagogieScope(user);
    if (scope.role === "guest") {
      return { success: false, error: "Accès non autorisé", data: [] };
    }

    const schoolId = await getActiveSchoolId();
    const isTeach = scope.role === "enseignant" && scope.teacherId;

    const rows = await db
      .select({
        classId: schoolClasses.id,
        className: schoolClasses.className,
        students: sql<number>`count(distinct ${students.id})::int`,
        planned: sql<number>`count(distinct ${pedagogiePlanification.id})::int`,
        realised: sql<number>`count(distinct ${cahierTextes.id})::int`,
        average: sql<number>`coalesce(avg(${studentResults.totalScore}), 0)::float`,
      })
      .from(schoolClasses)
      .leftJoin(students, eq(students.classe, schoolClasses.className))
      .leftJoin(pedagogiePlanification, eq(pedagogiePlanification.classId, schoolClasses.id))
      .leftJoin(cahierTextes, eq(cahierTextes.classId, schoolClasses.id))
      .leftJoin(studentResults, eq(studentResults.classId, schoolClasses.id))
      .where(
        and(
          eq(schoolClasses.schoolId, schoolId),
          isTeach ? or(
            eq(pedagogiePlanification.employeeId, scope.teacherId!),
            eq(cahierTextes.employeeId, scope.teacherId!)
          ) : undefined
        )
      )
      .groupBy(schoolClasses.id, schoolClasses.className)
      .limit(12);

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        progressRate: percent(Number(row.realised || 0), Number(row.planned || 0)),
        average: Math.round(Number(row.average || 0) * 10) / 10,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function getPedagogieSubjectOverview() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };

    const scope = getPedagogieScope(user);
    if (scope.role === "guest") {
      return { success: false, error: "Accès non autorisé", data: [] };
    }

    const schoolId = await getActiveSchoolId();
    const isTeach = scope.role === "enseignant" && scope.teacherId;

    const rows = await db
      .select({
        subjectId: schoolSubjects.id,
        subjectName: schoolSubjects.subjectName,
        planned: sql<number>`count(distinct ${pedagogiePlanification.id})::int`,
        realised: sql<number>`count(distinct ${cahierTextes.id})::int`,
        average: sql<number>`coalesce(avg(${studentResults.totalScore}), 0)::float`,
      })
      .from(schoolSubjects)
      .leftJoin(pedagogiePlanification, eq(pedagogiePlanification.subjectId, schoolSubjects.id))
      .leftJoin(cahierTextes, eq(cahierTextes.subjectId, schoolSubjects.id))
      .leftJoin(studentResults, eq(studentResults.subjectId, schoolSubjects.id))
      .where(
        and(
          eq(schoolSubjects.schoolId, schoolId),
          isTeach ? or(
            eq(pedagogiePlanification.employeeId, scope.teacherId!),
            eq(cahierTextes.employeeId, scope.teacherId!)
          ) : undefined
        )
      )
      .groupBy(schoolSubjects.id, schoolSubjects.subjectName)
      .limit(12);

    return {
      success: true,
      data: rows.map((row) => ({
        ...row,
        progressRate: percent(Number(row.realised || 0), Number(row.planned || 0)),
        average: Math.round(Number(row.average || 0) * 10) / 10,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function getPedagogicalReportAction(filters: PedagogicalFilters) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: null };

    const schoolId = await getActiveSchoolId();
    const filtersWithSchool = { ...filters, schoolId };

    const data = await PedagogicalDataService.getPedagogicalReportData(filtersWithSchool);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: null };
  }
}
