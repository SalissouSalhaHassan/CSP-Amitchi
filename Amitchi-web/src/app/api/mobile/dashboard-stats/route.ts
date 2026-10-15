import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import { readDb } from "@/infrastructure/database";
import { studentAttendance, teacherSessionAttendance } from "@/infrastructure/database/schema/attendance";
import {
  classSubjects,
  exams,
  schoolClasses,
  studentResults,
  timetableEntries,
} from "@/infrastructure/database/schema/academics";
import { homework } from "@/infrastructure/database/schema/homework";
import { cahierTextes, pedagogiePlanification } from "@/infrastructure/database/schema/pedagogie";
import { students } from "@/infrastructure/database/schema/students";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { getMobileUser } from "../_lib/auth";
import { getParentChildrenIds } from "../_lib/family-auth";

export const dynamic = "force-dynamic";

type StatsRecord = Record<string, number | boolean>;

function normalizeStatus(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function rate(present: number, total: number) {
  if (total <= 0) return 0;
  return Number(((present / total) * 100).toFixed(1));
}

function avg(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) return 0;
  return Number((usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(1));
}

async function getStudentIdsForSchool(schoolId: number | null) {
  const rows = await readDb.query.students.findMany({
    where: schoolId ? eq(students.schoolId, schoolId) : undefined,
    columns: { id: true },
  });
  return rows.map((row) => row.id);
}

async function countRows<T>(query: Promise<Array<T>>) {
  const rows = await query;
  return rows.length;
}

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

  const roleType = await getUserRoleType(user);
  const schoolId = user.schoolId ?? null;
  const isTeacher = roleType === "teacher" || roleType === "enseignant";
  const isFamily = roleType === "eleve" || roleType === "parent";

  let studentIds: number[] = [];
  if (roleType === "parent") {
    studentIds = await getParentChildrenIds(user);
  } else if (roleType === "eleve") {
    studentIds = user.studentId ? [user.studentId] : [];
  } else {
    studentIds = await getStudentIdsForSchool(schoolId);
  }

  const linkedStudent = roleType === "eleve" && user.studentId
    ? await readDb.query.students.findFirst({
        where: eq(students.id, user.studentId),
        columns: { classe: true },
      })
    : null;

  const classRows = await readDb.query.schoolClasses.findMany({
    where: schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
    columns: { id: true, className: true },
  });
  const classIds = classRows.map((row) => row.id);

  let familyClassIds: number[] = [];
  if (roleType === "parent") {
    if (studentIds.length > 0) {
      const parentChildren = await readDb.query.students.findMany({
        where: and(
          schoolId ? eq(students.schoolId, schoolId) : undefined,
          inArray(students.id, studentIds)
        ),
        columns: { classe: true },
      });
      const childClasses = parentChildren.map((c) => c.classe).filter(Boolean);
      if (childClasses.length > 0) {
        familyClassIds = classRows
          .filter((row) => row.className && childClasses.includes(row.className))
          .map((row) => row.id);
      }
    }
  } else if (linkedStudent?.classe) {
    familyClassIds = classRows
      .filter((row) => row.className === linkedStudent.classe)
      .map((row) => row.id);
  }

  const scopedClassIds = isFamily
    ? familyClassIds
    : isTeacher && user.employeeId
    ? Array.from(new Set([
        ...(await readDb.query.classSubjects.findMany({
          where: eq(classSubjects.employeeId, user.employeeId),
          columns: { classId: true },
        })).map((row) => row.classId),
        ...(await readDb.query.timetableEntries.findMany({
          where: eq(timetableEntries.employeeId, user.employeeId),
          columns: { classId: true },
        })).map((row) => row.classId)
      ].filter((id): id is number => Boolean(id))))
    : classIds;

  const teacherClassNames = isTeacher
    ? classRows
        .filter((row) => scopedClassIds.includes(row.id))
        .map((row) => row.className)
        .filter(Boolean)
    : [];
  const effectiveStudentIds = isTeacher && teacherClassNames.length > 0
    ? (await readDb.query.students.findMany({
        where: and(
          schoolId ? eq(students.schoolId, schoolId) : undefined,
          inArray(students.classe, teacherClassNames)
        ),
        columns: { id: true },
      })).map((row) => row.id)
    : studentIds;

  const attendanceRows = effectiveStudentIds.length > 0
    ? await readDb.query.studentAttendance.findMany({
        where: and(
          inArray(studentAttendance.studentId, effectiveStudentIds),
          isTeacher && user.employeeId ? eq(studentAttendance.employeeId, user.employeeId) : undefined
        ),
        columns: { status: true },
      })
    : [];

  const presentStudentAttendance = attendanceRows.filter((row) => {
    const status = normalizeStatus(row.status);
    return status.includes("present") || status.includes("retard") || status.includes("excuse");
  }).length;
  const absences = attendanceRows.filter((row) => normalizeStatus(row.status).includes("abs")).length;
  const lateAlerts = attendanceRows.filter((row) => normalizeStatus(row.status).includes("retard")).length;

  const teacherAttendanceRows = await readDb.query.teacherSessionAttendance.findMany({
    where: schoolId ? eq(teacherSessionAttendance.schoolId, schoolId) : undefined,
    columns: { status: true },
  });
  const presentTeacherAttendance = teacherAttendanceRows.filter((row) => {
    const status = normalizeStatus(row.status);
    return status.includes("present") || status.includes("retard");
  }).length;

  const resultRows = isFamily && effectiveStudentIds.length > 0
    ? await readDb.query.studentResults.findMany({
        where: inArray(studentResults.studentId, effectiveStudentIds),
        columns: { totalScore: true, moyenneDevoirs: true },
      })
    : scopedClassIds.length > 0
    ? await readDb.query.studentResults.findMany({
        where: inArray(studentResults.classId, scopedClassIds),
        columns: { totalScore: true, moyenneDevoirs: true },
      })
    : [];

  const homeworkCount = scopedClassIds.length > 0
    ? (await readDb.select({ count: count() }).from(homework).where(inArray(homework.classId, scopedClassIds)))[0]?.count || 0
    : 0;

  const examsCount = scopedClassIds.length > 0
    ? (await readDb.select({ count: count() }).from(exams).where(inArray(exams.classId, scopedClassIds)))[0]?.count || 0
    : schoolId
      ? (await readDb.select({ count: count() }).from(exams).where(eq(exams.schoolId, schoolId)))[0]?.count || 0
      : 0;

  const plannedHours = isTeacher && user.employeeId
    ? (await readDb.select({ count: count() }).from(timetableEntries).where(eq(timetableEntries.employeeId, user.employeeId)))[0]?.count || 0
    : scopedClassIds.length > 0
      ? (await readDb.select({ count: count() }).from(timetableEntries).where(inArray(timetableEntries.classId, scopedClassIds)))[0]?.count || 0
      : 0;

  const teacherPlans = isTeacher && user.employeeId
    ? await readDb.query.pedagogiePlanification.findMany({
        where: eq(pedagogiePlanification.employeeId, user.employeeId),
        columns: { statut: true },
      })
    : [];
  const teacherLessonsCount = isTeacher && user.employeeId
    ? (await readDb.select({ count: count() }).from(cahierTextes).where(eq(cahierTextes.employeeId, user.employeeId)))[0]?.count || 0
    : 0;
  const completedPlans = teacherPlans.filter((row) => {
    const status = normalizeStatus(row.statut);
    return status.includes("realise") || status.includes("valide");
  }).length;
  const homeworkAverage = avg(resultRows.map((row) => Number(row.moyenneDevoirs || 0)).filter((value) => value > 0));

  const stats: StatsRecord = {
    activeStudents: effectiveStudentIds.length,
    studentAttendanceRate: rate(presentStudentAttendance, attendanceRows.length),
    teacherAttendanceRate: rate(presentTeacherAttendance, teacherAttendanceRows.length),
    classesCount: scopedClassIds.length,
    examsCount,
    plannedHours,
    averageGrade: avg(resultRows.map((row) => {
      const val = Number(row.totalScore || 0);
      if (val <= 0) return 0;
      if (val <= 20) return val;
      if (val <= 40) return val / 2;
      if (val <= 100) return (val / 100) * 20;
      return 20;
    }).filter((value) => value > 0)),
    homeworkCount,
    homeworkOnTimeRate: homeworkAverage > 0 ? Number(((homeworkAverage / 20) * 100).toFixed(1)) : 0,
    absenceAlerts: absences,
    lateAlerts,
    hasStudentAttendanceData: attendanceRows.length > 0,
    hasTeacherAttendanceData: teacherAttendanceRows.length > 0,
    hasGradeData: resultRows.length > 0,
    hasHomeworkData: homeworkCount > 0,
    plannedLessons: teacherPlans.length,
    completedLessons: completedPlans || teacherLessonsCount,
    pedagogicalProgressRate: rate(completedPlans || teacherLessonsCount, teacherPlans.length || teacherLessonsCount),
    clubsCount: 0,
    eventsCount: 0,
  };

  return NextResponse.json({
    success: true,
    roleType,
    stats,
  });
}
