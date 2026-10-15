"use server";

import { db, readDb } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { studentTermSummaries, studentResults, schoolSubjects, schoolClasses, schoolSessions, academicPeriods } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { feePayments, expenses } from "@/infrastructure/database/schema/finance";
import { employees } from "@/infrastructure/database/schema/hr";
import { lmsCourses, lmsLessons, lmsAssignments, lmsSubmissions, lmsProgress, lmsQuizzes, lmsVirtualClasses } from "@/infrastructure/database/schema/lms";
import { cahierTextes, pedagogiePlanification, pedagogieRessources } from "@/infrastructure/database/schema/pedagogie";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getActiveEducationalLevel, getCompatibleLevels, hasAllEducationalLevels, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";

export async function getReportsData() {
  return protectedDbAction("Reports", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeLevel = await getActiveEducationalLevel(user);
    
    let studentWhere = eq(students.schoolId, schoolId);
    
    if (activeLevel && !hasAllEducationalLevels(activeLevel)) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels)) as any;
      
      // Filter attendance and grades by joining with students
      // We can handle this in javascript after fetching or by inner joins.
    }

    try {
      // 1. Fetch Students
      const schoolStudents = await readDb.query.students.findMany({
        where: studentWhere
      });
      const studentIds = schoolStudents.map(s => s.id);
      
      // If no students exist, return an explicit empty report instead of synthetic values.
      if (studentIds.length === 0) {
        return getEmptyReportsData();
      }

      // 2. Fetch Attendance
      let attRecords: any[] = [];
      if (studentIds.length > 0) {
        attRecords = await readDb.query.studentAttendance.findMany({
          where: inArray(studentAttendance.studentId, studentIds)
        });
      }

      // Compute Attendance KPIs
      const totalAtt = attRecords.length;
      let globalAttendanceRate = 0;
      let unexcusedAbsences = 0;
      let excusedAbsences = 0;
      let lateRate = 0;

      if (totalAtt > 0) {
        const presents = attRecords.filter(r => r.status === "Présent").length;
        const absents = attRecords.filter(r => r.status === "Absent").length;
        const lates = attRecords.filter(r => r.status === "En Retard").length;
        const excused = attRecords.filter(r => r.status === "Excusé").length;

        globalAttendanceRate = ((presents + lates + excused) / totalAtt) * 100;
        unexcusedAbsences = absents;
        excusedAbsences = excused;
        lateRate = (lates / totalAtt) * 100;
      }

      // Daily attendance evolution (Lundi - Vendredi)
      const dayMap: Record<string, { Presents: number; Absents: number; Lates: number; total: number }> = {
        "Lundi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Mardi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Mercredi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Jeudi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Vendredi": { Presents: 0, Absents: 0, Lates: 0, total: 0 }
      };

      const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      attRecords.forEach(r => {
        if (!r.date) return;
        const dayName = daysOfWeek[new Date(r.date).getDay()];
        if (dayMap[dayName]) {
          dayMap[dayName].total++;
          if (r.status === "Présent" || r.status === "Excusé") dayMap[dayName].Presents++;
          else if (r.status === "Absent") dayMap[dayName].Absents++;
          else if (r.status === "En Retard") dayMap[dayName].Lates++;
        }
      });

      const dailyEvolution = Object.entries(dayMap).map(([day, val]) => {
        const total = val.total;
        return {
          day,
          Presents: total > 0 ? Number(((val.Presents / total) * 100).toFixed(1)) : 0,
          Absents: total > 0 ? Number(((val.Absents / total) * 100).toFixed(1)) : 0,
          Lates: total > 0 ? Number(((val.Lates / total) * 100).toFixed(1)) : 0
        };
      });

      // Attendance by cycle
      const cycleMap: Record<string, { presents: number; total: number }> = {
        "Primaire": { presents: 0, total: 0 },
        "Collège": { presents: 0, total: 0 },
        "Lycée": { presents: 0, total: 0 }
      };

      const studentLevelMap = new Map(schoolStudents.map(s => [s.id, s.educationalLevel || "Primaire"]));
      attRecords.forEach(r => {
        const level = studentLevelMap.get(r.studentId) || "Primaire";
        let cycleKey = "Primaire";
        if (level.includes("Collège") || level.includes("College")) cycleKey = "Collège";
        else if (level.includes("Lycée") || level.includes("Lycee")) cycleKey = "Lycée";

        if (cycleMap[cycleKey]) {
          cycleMap[cycleKey].total++;
          if (r.status !== "Absent") {
            cycleMap[cycleKey].presents++;
          }
        }
      });

      const attendanceByCycle = Object.entries(cycleMap).map(([cycle, val]) => {
        const total = val.total;
        return {
          cycle,
          Rate: total > 0 ? Number(((val.presents / total) * 100).toFixed(1)) : 0
        };
      });

      // 3. Fetch Grades & Performance
      let summaries: any[] = [];
      if (studentIds.length > 0) {
        summaries = await readDb.query.studentTermSummaries.findMany({
          where: inArray(studentTermSummaries.studentId, studentIds)
        });
      }

      let averageGrade = 0;
      let successRate = 0;
      let congratulatedStudents = 0;
      let strugglingStudents = 0;

      const totalSummaries = summaries.length;
      if (totalSummaries > 0) {
        const totalAvg = summaries.reduce((acc, s) => acc + (s.average || 0), 0);
        averageGrade = Number((totalAvg / totalSummaries).toFixed(1));
        
        const passed = summaries.filter(s => (s.average || 0) >= 10.0).length;
        successRate = Number(((passed / totalSummaries) * 100).toFixed(1));
        
        congratulatedStudents = summaries.filter(s => (s.average || 0) >= 16.0).length;
        strugglingStudents = summaries.filter(s => (s.average || 0) < 10.0).length;
      }

      // Grade distribution (Tranches)
      const tranches = [
        { tranche: "[0 - 5[", min: 0, max: 5, Count: 0 },
        { tranche: "[5 - 10[", min: 5, max: 10, Count: 0 },
        { tranche: "[10 - 12[", min: 10, max: 12, Count: 0 },
        { tranche: "[12 - 14[", min: 12, max: 14, Count: 0 },
        { tranche: "[14 - 16[", min: 14, max: 16, Count: 0 },
        { tranche: "[16 - 18[", min: 16, max: 18, Count: 0 },
        { tranche: "[18 - 20]", min: 18, max: 20.01, Count: 0 }
      ];

      summaries.forEach(s => {
        const avg = s.average || 0;
        const t = tranches.find(tr => avg >= tr.min && avg < tr.max);
        if (t) t.Count++;
      });

      const gradeDistribution = tranches.map(t => ({ tranche: t.tranche, Count: t.Count }));

      // Subject Averages
      let resultsRecords: any[] = [];
      if (studentIds.length > 0) {
        resultsRecords = await readDb.query.studentResults.findMany({
          where: inArray(studentResults.studentId, studentIds),
          with: { subject: true }
        });
      }

      const subjectAvgMap: Record<string, { sum: number; count: number }> = {};
      resultsRecords.forEach(r => {
        if (!r.subject?.subjectName) return;
        const name = r.subject.subjectName;
        if (!subjectAvgMap[name]) {
          subjectAvgMap[name] = { sum: 0, count: 0 };
        }
        subjectAvgMap[name].sum += r.totalScore || 0;
        subjectAvgMap[name].count++;
      });

      const subjectAverages = Object.entries(subjectAvgMap).map(([subject, val]) => ({
        subject,
        Average: Number((val.sum / val.count).toFixed(1))
      })).sort((a, b) => b.Average - a.Average);

      return {
        success: true,
        data: {
          attendanceKpis: {
            globalAttendanceRate: Number(globalAttendanceRate.toFixed(1)),
            unexcusedAbsences,
            lateRate: Number(lateRate.toFixed(1)),
            excusedAbsences,
            hasData: totalAtt > 0
          },
          dailyEvolution,
          attendanceByCycle,
          performanceKpis: {
            averageGrade,
            successRate,
            congratulatedStudents,
            strugglingStudents,
            hasData: totalSummaries > 0
          },
          gradeDistribution,
          subjectAverages,
          hasStudents: studentIds.length > 0,
          hasGrades: totalSummaries > 0 || resultsRecords.length > 0
        }
      };
    } catch (e: any) {
      console.error("Error in getReportsData:", e);
      return { success: false, error: e.message, data: getEmptyReportsData().data };
    }
  });
}

function getEmptyReportsData() {
  return {
    success: true,
    data: {
      attendanceKpis: {
        globalAttendanceRate: 0,
        unexcusedAbsences: 0,
        lateRate: 0,
        excusedAbsences: 0,
        hasData: false
      },
      dailyEvolution: [
        { day: "Lundi", Presents: 0, Absents: 0, Lates: 0 },
        { day: "Mardi", Presents: 0, Absents: 0, Lates: 0 },
        { day: "Mercredi", Presents: 0, Absents: 0, Lates: 0 },
        { day: "Jeudi", Presents: 0, Absents: 0, Lates: 0 },
        { day: "Vendredi", Presents: 0, Absents: 0, Lates: 0 }
      ],
      attendanceByCycle: [
        { cycle: "Primaire", Rate: 0 },
        { cycle: "Collège", Rate: 0 },
        { cycle: "Lycée", Rate: 0 }
      ],
      performanceKpis: {
        averageGrade: 0,
        successRate: 0,
        congratulatedStudents: 0,
        strugglingStudents: 0,
        hasData: false
      },
      gradeDistribution: [
        { tranche: "[0 - 5[", Count: 0 },
        { tranche: "[5 - 10[", Count: 0 },
        { tranche: "[10 - 12[", Count: 0 },
        { tranche: "[12 - 14[", Count: 0 },
        { tranche: "[14 - 16[", Count: 0 },
        { tranche: "[16 - 18[", Count: 0 },
        { tranche: "[18 - 20]", Count: 0 }
      ],
      subjectAverages: [],
      hasStudents: false,
      hasGrades: false
    }
  };
}

export async function getUnifiedReportsData() {
  return protectedDbAction("Reports", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeLevel = await getActiveEducationalLevel(user);
    const isLevelScoped = Boolean(activeLevel && !hasAllEducationalLevels(activeLevel));
    const compatibleLevels = isLevelScoped ? getCompatibleLevels(activeLevel!) : [];

    const safeQuery = async <T>(label: string, query: Promise<T[]>): Promise<T[]> => {
      try {
        return await query;
      } catch (error) {
        console.error(`Unified reports partial load failed: ${label}`, error);
        return [];
      }
    };

    let studentWhere: any = eq(students.schoolId, schoolId);
    if (isLevelScoped) {
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels));
    }

    const allStudents = await safeQuery("students", readDb.query.students.findMany({
      where: studentWhere
    }));
    const studentIds = allStudents.map((s: any) => s.id).filter(Boolean);

    const allClasses = await safeQuery("classes", readDb.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId),
      with: { section: true }
    }));

    const classes = isLevelScoped
      ? allClasses.filter((c: any) => {
          const secLevel = c.section?.educationalLevel;
          return checkEducationalLevelAccess(user, secLevel);
        })
      : allClasses;
    const classIds = classes.map((c: any) => c.id).filter(Boolean);

    const [subjects, sessions, periods, allEmployees, rawFeePayments, allExpenses] = await Promise.all([
      safeQuery("subjects", readDb.query.schoolSubjects.findMany({ where: eq(schoolSubjects.schoolId, schoolId) })),
      safeQuery("sessions", readDb.query.schoolSessions.findMany({ where: eq(schoolSessions.schoolId, schoolId) })),
      safeQuery("periods", readDb.query.academicPeriods.findMany({ where: eq(academicPeriods.schoolId, schoolId) })),
      safeQuery("employees", readDb.query.employees.findMany({ where: eq(employees.schoolId, schoolId) })),
      safeQuery("fee payments", readDb.query.feePayments.findMany({ where: eq(feePayments.schoolId, schoolId) })),
      safeQuery("expenses", readDb.query.expenses.findMany({ where: eq(expenses.schoolId, schoolId) })),
    ]);

    const allFeePayments = isLevelScoped
      ? (studentIds.length > 0 ? rawFeePayments.filter((p: any) => studentIds.includes(p.studentId)) : [])
      : rawFeePayments;

    const [attendance, rawSeances, rawPlans, resources, audit, grades] = await Promise.all([
      studentIds.length > 0
        ? safeQuery("attendance", readDb.query.studentAttendance.findMany({ where: inArray(studentAttendance.studentId, studentIds) }))
        : Promise.resolve([]),
      safeQuery("pedagogie cahier textes", readDb.query.cahierTextes.findMany({ where: eq(cahierTextes.schoolId, schoolId) })),
      safeQuery("pedagogie planification", readDb.query.pedagogiePlanification.findMany({ where: eq(pedagogiePlanification.schoolId, schoolId) })),
      safeQuery("pedagogie resources", readDb.query.pedagogieRessources.findMany({ where: eq(pedagogieRessources.schoolId, schoolId) })),
      safeQuery("audit logs", readDb.query.auditLogs.findMany({
        where: eq(auditLogs.schoolId, schoolId),
        orderBy: [desc(auditLogs.timestamp)],
        limit: 100
      })),
      studentIds.length > 0
        ? safeQuery("grades", readDb.query.studentResults.findMany({ where: inArray(studentResults.studentId, studentIds) }))
        : Promise.resolve([]),
    ]);

    const seances = isLevelScoped
      ? rawSeances.filter((s: any) => s.classId && classIds.includes(s.classId))
      : rawSeances;

    const plans = isLevelScoped
      ? rawPlans.filter((p: any) => p.classId && classIds.includes(p.classId))
      : rawPlans;

    let courses: any[] = [];
    let lessons: any[] = [];
    let assignments: any[] = [];
    let submissions: any[] = [];
    let progress: any[] = [];
    let virtualClasses: any[] = [];

    if (classIds.length > 0) {
      [courses, assignments, virtualClasses] = await Promise.all([
        safeQuery("lms courses", readDb.query.lmsCourses.findMany({ where: inArray(lmsCourses.classId, classIds) })),
        safeQuery("lms assignments", readDb.query.lmsAssignments.findMany({ where: inArray(lmsAssignments.classId, classIds) })),
        safeQuery("lms virtual classes", readDb.query.lmsVirtualClasses.findMany({ where: inArray(lmsVirtualClasses.classId, classIds) })),
      ]);

      const courseIds = courses.map((c: any) => c.id).filter(Boolean);
      if (courseIds.length > 0) {
        lessons = await safeQuery("lms lessons", readDb.query.lmsLessons.findMany({ where: inArray(lmsLessons.courseId, courseIds) }));
      }
    }

    if (studentIds.length > 0) {
      [submissions, progress] = await Promise.all([
        safeQuery("lms submissions", readDb.query.lmsSubmissions.findMany({ where: inArray(lmsSubmissions.studentId, studentIds) })),
        safeQuery("lms progress", readDb.query.lmsProgress.findMany({ where: inArray(lmsProgress.studentId, studentIds) })),
      ]);
    }

    return {
      success: true,
      data: {
        students: allStudents,
        classes,
        subjects,
        employees: allEmployees,
        feePayments: allFeePayments,
        expenses: allExpenses,
        attendance,
        seances,
        plans,
        resources,
        courses,
        lessons,
        assignments,
        submissions,
        progress,
        virtualClasses,
        auditLogs: audit,
        grades,
        sessions,
        periods
      }
    };
  });
}

export async function quickFixStudentData(id: number, data: Partial<typeof students.$inferInsert>) {
  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const safeData = { ...(data || {}) };
    delete safeData.id;
    delete safeData.schoolId;

    const updated = await db
      .update(students)
      .set(safeData)
      .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
      .returning({ id: students.id });

    if (updated.length === 0) {
      return { success: false, error: "Étudiant introuvable pour cette école." };
    }

    return { success: true };
  });
}

export async function quickFixPaymentReference(id: number, reference: string) {
  return protectedDbAction("Finance", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const updated = await db
      .update(feePayments)
      .set({ reference })
      .where(and(eq(feePayments.id, id), eq(feePayments.schoolId, schoolId)))
      .returning({ id: feePayments.id });

    if (updated.length === 0) {
      return { success: false, error: "Paiement introuvable pour cette école." };
    }

    return { success: true };
  });
}

export async function quickFixGrade(id: number, score: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const updated = await db
      .update(studentResults)
      .set({ totalScore: score })
      .where(and(
        eq(studentResults.id, id),
        sql`(
          EXISTS (
            SELECT 1 FROM students
            WHERE students.id = ${studentResults.studentId}
              AND students.school_id = ${schoolId}
          )
          OR EXISTS (
            SELECT 1 FROM school_classes
            WHERE school_classes.id = ${studentResults.classId}
              AND school_classes.school_id = ${schoolId}
          )
        )`
      ))
      .returning({ id: studentResults.id });

    if (updated.length === 0) {
      return { success: false, error: "Note introuvable pour cette école." };
    }

    return { success: true };
  });
}
