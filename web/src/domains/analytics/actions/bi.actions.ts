"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { exams, examResults, schoolClasses, schoolSubjects, academicPeriods } from "@/infrastructure/database/schema/academics";
import { eq, and, desc, sql, gte, asc } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export async function getPredictiveAnalyticsData() {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();

    // ─── 1. DROPOUT RISK ANALYTICS ──────────────────────────────────────────
    // Get all attendance records for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attendanceRecords = await db
      .select({
        id: studentAttendance.id,
        studentId: studentAttendance.studentId,
        date: studentAttendance.date,
        status: studentAttendance.status,
      })
      .from(studentAttendance)
      .where(
        and(
          gte(studentAttendance.date, thirtyDaysAgo),
          // filter by school if we had schoolId in attendance, otherwise we match by student's school
        )
      )
      .orderBy(asc(studentAttendance.date));

    // Get all students for this school
    const schoolStudents = await db
      .select({
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
        classe: students.classe,
        educationalLevel: students.educationalLevel,
        behaviorScore: students.behaviorScore,
      })
      .from(students)
      .where(eq(students.schoolId, schoolId));

    const studentMap = new Map(schoolStudents.map((s) => [s.id, s]));

    // Calculate streaks and rates
    const stats: Record<number, { total: number; absences: number; consecutiveAbsences: number; currentStreak: number }> = {};

    for (const record of attendanceRecords) {
      if (!record.studentId || !studentMap.has(record.studentId)) continue;
      
      const sId = record.studentId;
      if (!stats[sId]) {
        stats[sId] = { total: 0, absences: 0, consecutiveAbsences: 0, currentStreak: 0 };
      }

      stats[sId].total += 1;
      
      const isAbsent = record.status === "Absent" || record.status === "Absence";
      if (isAbsent) {
        stats[sId].absences += 1;
        stats[sId].currentStreak += 1;
        if (stats[sId].currentStreak > stats[sId].consecutiveAbsences) {
          stats[sId].consecutiveAbsences = stats[sId].currentStreak;
        }
      } else if (record.status === "Présent" || record.status === "Present") {
        stats[sId].currentStreak = 0;
      }
    }

    const dropoutAlerts: any[] = [];
    let highRiskCount = 0;
    let mediumRiskCount = 0;

    for (const [sId, studentInfo] of studentMap.entries()) {
      const studentStats = stats[sId] || { total: 0, absences: 0, consecutiveAbsences: 0, currentStreak: 0 };
      
      const absenceRate = studentStats.total > 0 ? (studentStats.absences / studentStats.total) * 100 : 0;
      const consecutiveAbs = studentStats.consecutiveAbsences;

      let riskLevel: "Critique" | "Moyen" | "Faible" = "Faible";
      let riskScore = 0;

      // Risk score heuristics
      if (consecutiveAbs >= 3 || absenceRate >= 20) {
        riskLevel = "Critique";
        riskScore = Math.min(100, 75 + consecutiveAbs * 5 + (absenceRate - 20));
        highRiskCount++;
      } else if (absenceRate >= 10 || consecutiveAbs >= 2) {
        riskLevel = "Moyen";
        riskScore = Math.min(74, 40 + (absenceRate * 1.5) + consecutiveAbs * 10);
        mediumRiskCount++;
      } else {
        riskScore = Math.min(39, absenceRate * 2 + consecutiveAbs * 5);
      }

      // Only flag students with some absence alerts
      if (riskLevel !== "Faible") {
        dropoutAlerts.push({
          studentId: sId,
          nomEtudiant: studentInfo.nomEtudiant,
          numAdmission: studentInfo.numAdmission,
          classe: studentInfo.classe,
          educationalLevel: studentInfo.educationalLevel,
          absenceRate: Math.round(absenceRate),
          consecutiveAbsences: consecutiveAbs,
          behaviorScore: studentInfo.behaviorScore || 100,
          riskLevel,
          riskScore: Math.round(riskScore),
        });
      }
    }

    // Sort by risk score descending
    dropoutAlerts.sort((a, b) => b.riskScore - a.riskScore);


    // ─── 2. CLASS REGRESSION ANALYTICS ──────────────────────────────────────
    // Query exam averages grouped by class, subject, and period
    const examData = await db
      .select({
        classId: exams.classId,
        subjectId: exams.subjectId,
        periodId: exams.periodId,
        avgMarks: sql<number>`COALESCE(AVG(${examResults.marksObtained}), 0)`,
        maxMarks: sql<number>`COALESCE(MAX(${exams.maxMarks}), 20)`,
      })
      .from(examResults)
      .innerJoin(exams, eq(examResults.examId, exams.id))
      .where(eq(exams.schoolId, schoolId))
      .groupBy(exams.classId, exams.subjectId, exams.periodId);

    // Retrieve names of classes, subjects, and periods
    const allClasses = await db.select().from(schoolClasses).where(eq(schoolClasses.schoolId, schoolId));
    const allSubjects = await db.select().from(schoolSubjects).where(eq(schoolSubjects.schoolId, schoolId));
    const allPeriods = await db.select().from(academicPeriods).where(eq(academicPeriods.schoolId, schoolId));

    const classMap = new Map(allClasses.map((c) => [c.id, c.className]));
    const subjectMap = new Map(allSubjects.map((s) => [s.id, s.subjectName]));
    const periodMap = new Map(allPeriods.map((p) => [p.id, p]));

    // Group periods by date/ID to order them
    const sortedPeriods = [...allPeriods].sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : a.id;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : b.id;
      return dateA - dateB;
    });
    const periodOrderMap = new Map(sortedPeriods.map((p, idx) => [p.id, idx]));

    // Group exam averages by classId + subjectId
    const classSubjectHistory: Record<string, Array<{ periodId: number; avg20: number; periodName: string; order: number }>> = {};

    for (const item of examData) {
      if (!item.classId || !item.subjectId || !item.periodId) continue;
      const key = `${item.classId}-${item.subjectId}`;
      if (!classSubjectHistory[key]) {
        classSubjectHistory[key] = [];
      }

      const pInfo = periodMap.get(item.periodId);
      const periodName = pInfo ? pInfo.name : `Période ${item.periodId}`;
      const order = periodOrderMap.get(item.periodId) ?? 0;

      // Normalize average to /20
      const maxM = item.maxMarks || 20;
      const avg20 = (item.avgMarks / maxM) * 20;

      classSubjectHistory[key].push({
        periodId: item.periodId,
        avg20,
        periodName,
        order,
      });
    }

    const regressionAlerts: any[] = [];

    for (const [key, history] of Object.entries(classSubjectHistory)) {
      if (history.length < 2) continue; // Need at least two periods to compare!

      // Sort history by period order ascending
      history.sort((a, b) => a.order - b.order);

      const latest = history[history.length - 1];
      const previous = history[history.length - 2];

      const diff = latest.avg20 - previous.avg20;
      const diffPercent = previous.avg20 > 0 ? (diff / previous.avg20) * 100 : 0;

      // Trigger warning if drop is greater than 15% (e.g. diffPercent <= -15)
      if (diffPercent <= -15) {
        const [cId, sId] = key.split("-").map(Number);
        regressionAlerts.push({
          classId: cId,
          className: classMap.get(cId) || `Classe ${cId}`,
          subjectId: sId,
          subjectName: subjectMap.get(sId) || `Matière ${sId}`,
          previousPeriodName: previous.periodName,
          latestPeriodName: latest.periodName,
          previousAverage: Math.round(previous.avg20 * 10) / 10,
          latestAverage: Math.round(latest.avg20 * 10) / 10,
          dropPercentage: Math.round(Math.abs(diffPercent)),
        });
      }
    }

    // Overall metrics
    let totalAbsences = 0;
    let totalAttendanceRecords = attendanceRecords.length;
    
    for (const record of attendanceRecords) {
      if (record.status === "Présent" || record.status === "Present") {
        // present
      } else if (record.status === "Absent" || record.status === "Absence") {
        totalAbsences++;
      }
    }
    
    const overallAttendanceRate = totalAttendanceRecords > 0 
      ? Math.round(((totalAttendanceRecords - totalAbsences) / totalAttendanceRecords) * 100)
      : 95; // Default standard baseline

    // ─── 3. REAL DB INDICATORS & CORRELATIONS ─────────────────────────────
    
    // A. Real Subject Success Rates
    const subjectStatsRaw = await db
      .select({
        subjectId: exams.subjectId,
        subjectName: schoolSubjects.subjectName,
        totalCount: sql<number>`COUNT(${examResults.id})`,
        passedCount: sql<number>`SUM(CASE WHEN ${examResults.marksObtained} >= 10 THEN 1 ELSE 0 END)`,
        avgMarks: sql<number>`AVG(${examResults.marksObtained})`,
      })
      .from(examResults)
      .innerJoin(exams, eq(examResults.examId, exams.id))
      .innerJoin(schoolSubjects, eq(exams.subjectId, schoolSubjects.id))
      .where(eq(exams.schoolId, schoolId))
      .groupBy(exams.subjectId, schoolSubjects.subjectName);

    const weakSubjects = subjectStatsRaw.map((item) => {
      const total = Number(item.totalCount) || 1;
      const passed = Number(item.passedCount) || 0;
      const passRate = Math.round((passed / total) * 100);
      const avg = Math.round((Number(item.avgMarks) || 0) * 10) / 10;
      let status = "Normal";
      if (passRate < 50 || avg < 10) status = "Critique";
      else if (passRate < 65 || avg < 12) status = "Faible";

      return {
        name: item.subjectName || `Matière ${item.subjectId}`,
        avg: `${avg} / 20`,
        passRate,
        status,
      };
    }).sort((a, b) => a.passRate - b.passRate);

    // B. Real Class Success Rates
    const classStatsRaw = await db
      .select({
        classId: exams.classId,
        className: schoolClasses.className,
        totalCount: sql<number>`COUNT(${examResults.id})`,
        passedCount: sql<number>`SUM(CASE WHEN ${examResults.marksObtained} >= 10 THEN 1 ELSE 0 END)`,
      })
      .from(examResults)
      .innerJoin(exams, eq(examResults.examId, exams.id))
      .innerJoin(schoolClasses, eq(exams.classId, schoolClasses.id))
      .where(eq(exams.schoolId, schoolId))
      .groupBy(exams.classId, schoolClasses.className);

    const classSuccessRates = classStatsRaw.map((item) => {
      const total = Number(item.totalCount) || 1;
      const passed = Number(item.passedCount) || 0;
      const rate = Math.round((passed / total) * 100);
      return {
        name: item.className || `Classe ${item.classId}`,
        rate,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    // C. Real Absences vs Failure Correlation
    const studentGradesRaw = await db
      .select({
        studentId: examResults.studentId,
        avgGrade: sql<number>`AVG(${examResults.marksObtained})`,
      })
      .from(examResults)
      .innerJoin(exams, eq(examResults.examId, exams.id))
      .where(eq(exams.schoolId, schoolId))
      .groupBy(examResults.studentId);

    const studentGradeMap = new Map(studentGradesRaw.map(g => [g.studentId, Number(g.avgGrade) || 0]));

    const absenceGroupGrades: Record<string, { totalGrades: number; count: number }> = {
      "0 - 2 jours": { totalGrades: 0, count: 0 },
      "3 - 5 jours": { totalGrades: 0, count: 0 },
      "6 - 10 jours": { totalGrades: 0, count: 0 },
      "+ 10 jours": { totalGrades: 0, count: 0 },
    };

    for (const s of schoolStudents) {
      const sStats = stats[s.id] || { absences: 0 };
      const absCount = sStats.absences || 0;
      const grade = studentGradeMap.get(s.id);
      if (grade === undefined) continue;

      let key = "0 - 2 jours";
      if (absCount >= 3 && absCount <= 5) key = "3 - 5 jours";
      else if (absCount >= 6 && absCount <= 10) key = "6 - 10 jours";
      else if (absCount > 10) key = "+ 10 jours";

      absenceGroupGrades[key].totalGrades += grade;
      absenceGroupGrades[key].count += 1;
    }

    const absencesFailureCorrelation = Object.entries(absenceGroupGrades).map(([range, data]) => {
      const avg = data.count > 0 ? Math.round((data.totalGrades / data.count) * 10) / 10 : 0;
      let status = "Excellent";
      if (range === "3 - 5 jours") status = "Moyen";
      if (range === "6 - 10 jours") status = "Risque modéré";
      if (range === "+ 10 jours") status = "Risque élevé";

      return {
        range,
        avgGrade: data.count > 0 ? `${avg} / 20` : "-- / 20",
        status,
        studentCount: data.count,
      };
    });

    return {
      dropoutAlerts,
      regressionAlerts,
      indicators: {
        weakSubjects,
        classSuccessRates,
        absencesFailureCorrelation,
      },
      metrics: {
        highRiskCount,
        mediumRiskCount,
        regressionCount: regressionAlerts.length,
        overallAttendanceRate,
      }
    };
  });
}
