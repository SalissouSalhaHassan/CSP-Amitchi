import { db } from "@/infrastructure/database";
import { 
  schoolClasses, 
  schoolSubjects, 
  classSubjects, 
  studentResults, 
  studentTermSummaries, 
  schoolSections,
  schoolSessions,
  academicPeriods
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { employees } from "@/infrastructure/database/schema/hr";
import { cahierTextes, pedagogiePlanification, pedagogieRemediation } from "@/infrastructure/database/schema/pedagogie";
import { homework } from "@/infrastructure/database/schema/homework";
import { eq, and, or, inArray, isNull, sql, ilike } from "drizzle-orm";

export interface PedagogicalFilters {
  schoolId?: number;
  sessionId?: number;
  period?: string; // e.g. "1er Trimestre"
  level?: string;  // e.g. "Primaire", "Collège", "Lycée"
  sectionId?: number;
  classId?: number;
  subjectId?: number;
  teacherId?: number;
}

export interface PedagogicalReportData {
  students: any[];
  classInfo: any | null;
  subjectInfo: any | null;
  teacherInfo: any | null;
  attendanceSummary: {
    totalSessions: number;
    presentsCount: number;
    absentsCount: number;
    attendanceRate: number;
    studentStats: Record<number, { presents: number; absents: number; rate: number }>;
  };
  gradesSummary: any[];
  classAverage: number;
  successRate: number;
  failureRate: number;
  weakStudents: any[];
  topStudents: any[];
  subjectAverages: Array<{ subjectId: number; subjectName: string; average: number; coefficient: number }>;
  remediationNeeds: any[];
  planificationStats: {
    planned: number;
    realized: number;
    rate: number;
  };
  homeworks: any[];
}

export class PedagogicalDataService {
  /**
   * Fetches unified data for educational and pedagogical reporting.
   */
  static async getPedagogicalReportData(filters: PedagogicalFilters): Promise<PedagogicalReportData> {
    const schoolId = filters.schoolId;
    const sessionId = filters.sessionId;
    const period = filters.period || "All";
    const level = filters.level;
    const sectionId = filters.sectionId;
    const classId = filters.classId;
    const subjectId = filters.subjectId;
    const teacherId = filters.teacherId;

    // 1. Resolve Class IDs and Names under filters scope
    let targetClassIds: number[] = [];
    let targetClassNames: string[] = [];

    // Find class info if classId specified
    let classInfo: any = null;
    if (classId) {
      const cls = await db.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        with: { section: true }
      });
      if (cls) {
        classInfo = cls;
        targetClassIds.push(cls.id);
        targetClassNames.push(cls.className.trim());
      }
    } else if (sectionId) {
      const classes = await db.query.schoolClasses.findMany({
        where: eq(schoolClasses.sectionId, sectionId)
      });
      targetClassIds = classes.map(c => c.id);
      targetClassNames = classes.map(c => c.className.trim());
    } else if (level && schoolId) {
      // Find sections of this level
      const sections = await db.query.schoolSections.findMany({
        where: and(
          eq(schoolSections.schoolId, schoolId),
          ilike(schoolSections.educationalLevel, level)
        )
      });
      const sectionIds = sections.map(s => s.id);
      if (sectionIds.length > 0) {
        const classes = await db.query.schoolClasses.findMany({
          where: inArray(schoolClasses.sectionId, sectionIds)
        });
        targetClassIds = classes.map(c => c.id);
        targetClassNames = classes.map(c => c.className.trim());
      }
    } else if (schoolId) {
      const classes = await db.query.schoolClasses.findMany({
        where: eq(schoolClasses.schoolId, schoolId)
      });
      targetClassIds = classes.map(c => c.id);
      targetClassNames = classes.map(c => c.className.trim());
    }

    // 2. Fetch primary objects in parallel
    const [studentList, subjectInfo, teacherInfo] = await Promise.all([
      targetClassNames.length > 0
        ? db.query.students.findMany({
            where: inArray(students.classe, targetClassNames)
          })
        : Promise.resolve([]),
      subjectId
        ? db.query.schoolSubjects.findFirst({
            where: eq(schoolSubjects.id, subjectId)
          })
        : Promise.resolve(null),
      teacherId
        ? db.query.employees.findFirst({
            where: eq(employees.id, teacherId)
          })
        : Promise.resolve(null)
    ]);

    const studentIds = studentList.map(s => s.id);

    // 3. Fetch academic results, attendance, and plans
    const [results, termSummaries, attendanceRecords, remediations, plans, homeworks] = await Promise.all([
      studentIds.length > 0 && sessionId
        ? db.query.studentResults.findMany({
            where: and(
              inArray(studentResults.studentId, studentIds),
              subjectId ? eq(studentResults.subjectId, subjectId) : undefined,
              eq(studentResults.sessionId, sessionId),
              period && period !== "All" ? eq(studentResults.term, period) : undefined
            )
          })
        : Promise.resolve([]),
      studentIds.length > 0 && sessionId
        ? db.query.studentTermSummaries.findMany({
            where: and(
              inArray(studentTermSummaries.studentId, studentIds),
              eq(studentTermSummaries.sessionId, sessionId),
              period && period !== "All" ? eq(studentTermSummaries.term, period) : undefined
            )
          })
        : Promise.resolve([]),
      targetClassIds.length > 0
        ? db.query.studentAttendance.findMany({
            where: and(
              inArray(studentAttendance.classId, targetClassIds),
              subjectId ? eq(studentAttendance.subjectId, subjectId) : undefined
            )
          })
        : Promise.resolve([]),
      studentIds.length > 0
        ? db.query.pedagogieRemediation.findMany({
            where: and(
              inArray(pedagogieRemediation.studentId, studentIds),
              subjectId ? eq(pedagogieRemediation.subjectId, subjectId) : undefined
            )
          })
        : Promise.resolve([]),
      targetClassIds.length > 0
        ? db.query.pedagogiePlanification.findMany({
            where: and(
              inArray(pedagogiePlanification.classId, targetClassIds),
              subjectId ? eq(pedagogiePlanification.subjectId, subjectId) : undefined,
              teacherId ? eq(pedagogiePlanification.employeeId, teacherId) : undefined
            )
          })
        : Promise.resolve([]),
      targetClassIds.length > 0
        ? db.query.homework.findMany({
            where: and(
              inArray(homework.classId, targetClassIds),
              subjectId ? eq(homework.subjectId, subjectId) : undefined
            )
          })
        : Promise.resolve([])
    ]);

    // 4. Cahier de textes sessions (Realized lessons)
    const realizedSessions = targetClassIds.length > 0
      ? await db.query.cahierTextes.findMany({
          where: and(
            inArray(cahierTextes.classId, targetClassIds),
            subjectId ? eq(cahierTextes.subjectId, subjectId) : undefined,
            teacherId ? eq(cahierTextes.employeeId, teacherId) : undefined
          )
        })
      : [];

    // 5. Compute Attendance Statistics
    const attendanceStats: Record<number, { presents: number; absents: number; rate: number }> = {};
    let presentsCount = 0;
    let absentsCount = 0;

    attendanceRecords.forEach(att => {
      const sId = att.studentId;
      if (sId) {
        if (!attendanceStats[sId]) {
          attendanceStats[sId] = { presents: 0, absents: 0, rate: 100 };
        }
        if (att.status === "Présent") {
          attendanceStats[sId].presents++;
          presentsCount++;
        } else if (att.status === "Absent") {
          attendanceStats[sId].absents++;
          absentsCount++;
        }
      }
    });

    // Calculate rates per student
    Object.keys(attendanceStats).forEach(sIdKey => {
      const sId = Number(sIdKey);
      const stat = attendanceStats[sId];
      const total = stat.presents + stat.absents;
      stat.rate = total > 0 ? Math.round((stat.presents / total) * 100) : 100;
    });

    const totalAttendanceSessions = presentsCount + absentsCount;
    const overallAttendanceRate = totalAttendanceSessions > 0 
      ? Math.round((presentsCount / totalAttendanceSessions) * 100) 
      : 100;

    // 6. Compute Grades, Averages, Success/Failure Rates
    let classAverage = 0.0;
    let successRate = 0.0;
    let failureRate = 0.0;
    const weakStudents: any[] = [];
    const topStudents: any[] = [];

    // Map results by student
    const studentGradesMap = new Map<number, number>(); // studentId -> overall average
    
    if (subjectId) {
      // If we filtered by a specific subject, averages are computed from studentResults
      results.forEach(res => {
        if (res.studentId && res.totalScore !== null) {
          studentGradesMap.set(res.studentId, res.totalScore);
        }
      });
    } else {
      // If no specific subject, overall term summaries averages are used
      termSummaries.forEach(ts => {
        if (ts.studentId && ts.average !== null) {
          studentGradesMap.set(ts.studentId, ts.average);
        }
      });

      // Fallback: calculate math average of results per student if term summaries are missing
      if (studentGradesMap.size === 0 && results.length > 0) {
        const studentGradesList: Record<number, { sum: number; count: number }> = {};
        results.forEach(res => {
          if (res.studentId && res.totalScore !== null) {
            if (!studentGradesList[res.studentId]) {
              studentGradesList[res.studentId] = { sum: 0, count: 0 };
            }
            studentGradesList[res.studentId].sum += res.totalScore;
            studentGradesList[res.studentId].count++;
          }
        });
        Object.entries(studentGradesList).forEach(([sId, stats]) => {
          studentGradesMap.set(Number(sId), stats.sum / stats.count);
        });
      }
    }

    // Enrich student records with average and match success/failure
    const enrichedStudents = studentList.map(student => {
      const avg = studentGradesMap.get(student.id) ?? null;
      return {
        ...student,
        average: avg,
        attendanceRate: attendanceStats[student.id]?.rate ?? 100
      };
    });

    const studentsWithGrades = enrichedStudents.filter(s => s.average !== null);
    if (studentsWithGrades.length > 0) {
      const totalGradesSum = studentsWithGrades.reduce((sum, s) => sum + (s.average || 0), 0);
      classAverage = Number((totalGradesSum / studentsWithGrades.length).toFixed(2));

      const successCount = studentsWithGrades.filter(s => (s.average || 0) >= 10.0).length;
      successRate = Number(((successCount / studentsWithGrades.length) * 100).toFixed(1));
      failureRate = Number((100 - successRate).toFixed(1));

      // Weak students (average < 10.0)
      studentsWithGrades.filter(s => (s.average || 0) < 10.0).forEach(s => weakStudents.push(s));
      
      // Top students (sorted descending)
      const sorted = [...studentsWithGrades].sort((a, b) => (b.average || 0) - (a.average || 0));
      sorted.forEach(s => topStudents.push(s));
    }

    // 7. Subject Averages (if multiple subjects are present in results)
    const subjectAveragesMap: Record<number, { sum: number; count: number; name: string; coef: number }> = {};
    results.forEach(res => {
      if (res.subjectId && res.totalScore !== null) {
        if (!subjectAveragesMap[res.subjectId]) {
          // Resolve name (mock or from db if available)
          subjectAveragesMap[res.subjectId] = { sum: 0, count: 0, name: `Matière ${res.subjectId}`, coef: res.coefficient || 1 };
        }
        subjectAveragesMap[res.subjectId].sum += res.totalScore;
        subjectAveragesMap[res.subjectId].count++;
      }
    });

    const subjectAveragesList = Object.entries(subjectAveragesMap).map(([subId, stats]) => ({
      subjectId: Number(subId),
      subjectName: stats.name,
      average: Number((stats.sum / stats.count).toFixed(2)),
      coefficient: stats.coef
    }));

    // 8. Remediation needs
    const remediationNeeds = remediations.map(rem => {
      const student = studentList.find(s => s.id === rem.studentId);
      return {
        ...rem,
        studentName: student?.nomEtudiant || "Élève inconnu"
      };
    });

    // 9. Planification and realized progress stats
    const plannedCount = plans.length;
    const realizedCount = realizedSessions.length;
    const progressionRate = plannedCount > 0 
      ? Math.round((realizedCount / plannedCount) * 100) 
      : 100;

    return {
      students: enrichedStudents,
      classInfo,
      subjectInfo,
      teacherInfo,
      attendanceSummary: {
        totalSessions: totalAttendanceSessions,
        presentsCount,
        absentsCount,
        attendanceRate: overallAttendanceRate,
        studentStats: attendanceStats
      },
      gradesSummary: results,
      classAverage,
      successRate,
      failureRate,
      weakStudents,
      topStudents: topStudents.slice(0, 10), // Return top 10
      subjectAverages: subjectAveragesList,
      remediationNeeds,
      planificationStats: {
        planned: plannedCount,
        realized: realizedCount,
        rate: progressionRate > 100 ? 100 : progressionRate
      },
      homeworks
    };
  }
}
