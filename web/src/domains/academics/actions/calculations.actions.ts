"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  exams,
  examResults,
  schoolClasses,
  schoolSubjects,
  schoolSessions,
  academicPeriods,
  classSubjects,
  sectionSubjects,
  studentResults,
  studentTermSummaries,
  schoolSections,
  gradingAppreciations,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, inArray, desc, sql, or } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { ActionResponse } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";
import { notifications } from "@/infrastructure/database/schema/messaging";

export interface ConsolidationOptions {
  classId: number;
  sessionId?: number;
  periodId?: number;
  term?: string;
  isHigherEd?: boolean;
}

export interface ConsolidationResult {
  success: boolean;
  classId: number;
  className: string;
  term: string;
  studentsCount: number;
  subjectsCount: number;
  consolidatedResultsCount: number;
  classAverage: number;
  highestAverage: number;
  lowestAverage: number;
  passRate: number; // percentage >= 10
  error?: string;
}

/**
 * Enterprise Academic Engine:
 * Consolidates all individual exam marks & evaluations into term results,
 * calculates weighted averages with coefficients, computes class rankings,
 * and updates official studentTermSummaries for report cards & delibérations.
 */
export async function consolidateClassTermGradesAction(
  options: ConsolidationOptions
): Promise<ActionResponse<ConsolidationResult>> {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    try {
      const { classId } = options;
      if (!classId) {
        return {
          success: false,
          classId: 0,
          className: "",
          term: "",
          studentsCount: 0,
          subjectsCount: 0,
          consolidatedResultsCount: 0,
          classAverage: 0,
          highestAverage: 0,
          lowestAverage: 0,
          passRate: 0,
          error: "ID de classe manquant",
        };
      }

      // 1. Fetch Class and Section Info
      const cls = await (readDb || db).query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        with: { section: true },
      });

      if (!cls) {
        return {
          success: false,
          classId,
          className: "",
          term: "",
          studentsCount: 0,
          subjectsCount: 0,
          consolidatedResultsCount: 0,
          classAverage: 0,
          highestAverage: 0,
          lowestAverage: 0,
          passRate: 0,
          error: "Classe introuvable",
        };
      }

      const schoolId = cls.schoolId ?? user.schoolId ?? 1;

      // 2. Resolve Active Session and Period
      let sessionId = options.sessionId;
      if (!sessionId) {
        const activeSess = await (readDb || db).query.schoolSessions.findFirst({
          where: eq(schoolSessions.schoolId, schoolId),
          orderBy: [
            sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
            desc(schoolSessions.id),
          ],
        });
        sessionId = activeSess?.id ?? 1;
      }

      let periodName = options.term;
      let periodId = options.periodId;

      if (!periodName || !periodId) {
        const periodObj = periodId
          ? await (readDb || db).query.academicPeriods.findFirst({
              where: eq(academicPeriods.id, periodId),
            })
          : await (readDb || db).query.academicPeriods.findFirst({
              where: and(
                eq(academicPeriods.sessionId, sessionId),
                eq(academicPeriods.isActive, true)
              ),
            }) ?? await (readDb || db).query.academicPeriods.findFirst({
              where: eq(academicPeriods.sessionId, sessionId),
            });

        if (periodObj) {
          periodName = periodObj.name;
          periodId = periodObj.id;
        } else {
          periodName = "1er Trimestre";
        }
      }

      const isHigherEd =
        options.isHigherEd ??
        ["Licence", "Master", "Doctorat", "Supérieur", "Université"].includes(
          cls.section?.educationalLevel || ""
        );

      // 3. Fetch all active students of the class
      const classStudents = await (readDb || db).select({
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
        classe: students.classe,
      })
      .from(students)
      .where(
        and(
          eq(students.schoolId, schoolId),
          or(
            eq(students.classId, classId),
            cls.className ? eq(students.classe, cls.className) : undefined
          ),
          eq(students.statut, "Actif")
        )
      )
      .orderBy(students.nomEtudiant);

      if (classStudents.length === 0) {
        return {
          success: false,
          classId,
          className: cls.className,
          term: periodName,
          studentsCount: 0,
          subjectsCount: 0,
          consolidatedResultsCount: 0,
          classAverage: 0,
          highestAverage: 0,
          lowestAverage: 0,
          passRate: 0,
          error: "Aucun élève actif trouvé dans cette classe",
        };
      }

      const studentIds = classStudents.map((s) => s.id);

      // 4. Fetch all subjects & coefficients for this class
      const [classSubjs, sectionSubjs, allSubjs] = await Promise.all([
        (readDb || db).query.classSubjects.findMany({
          where: eq(classSubjects.classId, classId),
        }),
        cls.sectionId
          ? (readDb || db).query.sectionSubjects.findMany({
              where: eq(sectionSubjects.sectionId, cls.sectionId),
            })
          : [],
        (readDb || db).query.schoolSubjects.findMany({
          where: eq(schoolSubjects.schoolId, schoolId),
        }),
      ]);

      const coefMap = new Map<number, number>();
      classSubjs.forEach((cs) => {
        if (cs.subjectId && cs.coefficient) coefMap.set(cs.subjectId, cs.coefficient);
      });
      sectionSubjs.forEach((ss) => {
        if (ss.subjectId && !coefMap.has(ss.subjectId) && ss.defaultCoef) {
          coefMap.set(ss.subjectId, ss.defaultCoef);
        }
      });

      // 5. Fetch all individual exams & marks for this class & period
      const classExams = await (readDb || db).select({
        id: exams.id,
        examName: exams.examName,
        subjectId: exams.subjectId,
        maxMarks: exams.maxMarks,
        examDate: exams.examDate,
      })
      .from(exams)
      .where(
        and(
          eq(exams.classId, classId),
          periodId ? eq(exams.periodId, periodId) : undefined
        )
      );

      const examIds = classExams.map((e) => e.id);
      let classMarks: any[] = [];
      if (examIds.length > 0) {
        classMarks = await (readDb || db).select({
          examId: examResults.examId,
          studentId: examResults.studentId,
          marksObtained: examResults.marksObtained,
        })
        .from(examResults)
        .where(
          and(
            inArray(examResults.examId, examIds),
            inArray(examResults.studentId, studentIds)
          )
        );
      }

      // 6. Fetch existing studentResults to preserve manual overrides if any
      const existingResults = await (readDb || db).query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.sessionId, sessionId),
          eq(studentResults.term, periodName),
          inArray(studentResults.studentId, studentIds)
        ),
      });

      const existingResultsMap = new Map<string, any>();
      existingResults.forEach((r) => {
        existingResultsMap.set(`${r.studentId}_${r.subjectId}`, r);
      });

      // 7. Group exams by subjectId
      const examsBySubject = new Map<number, typeof classExams>();
      classExams.forEach((ex) => {
        if (!ex.subjectId) return;
        const list = examsBySubject.get(ex.subjectId) || [];
        list.push(ex);
        examsBySubject.set(ex.subjectId, list);
      });

      // Distinct subjects evaluated
      const evaluatedSubjectIds = Array.from(examsBySubject.keys());
      if (evaluatedSubjectIds.length === 0) {
        // Fallback to subjects registered for the class
        classSubjs.forEach((cs) => {
          if (cs.subjectId && !evaluatedSubjectIds.includes(cs.subjectId)) {
            evaluatedSubjectIds.push(cs.subjectId);
          }
        });
      }

      // Fetch grading appreciation scale
      const appreciationsScale = await (readDb || db).query.gradingAppreciations.findMany({
        orderBy: [desc(gradingAppreciations.baseScore)],
      });

      const getAppreciationText = (avg: number) => {
        if (appreciationsScale.length > 0) {
          for (const item of appreciationsScale) {
            if (avg >= (item.baseScore || 0)) return item.name;
          }
        }
        if (avg >= 16) return "Très Bien";
        if (avg >= 14) return "Bien";
        if (avg >= 12) return "Assez Bien";
        if (avg >= 10) return "Passable";
        if (avg >= 8) return "Insuffisant";
        return "Médiocre";
      };

      // 8. Process subject results for each student
      let totalResultsInsertedOrUpdated = 0;
      const studentTermAggregates = new Map<
        number,
        { totalWeighted: number; totalCoeff: number; subjectCount: number }
      >();

      studentIds.forEach((sid) => {
        studentTermAggregates.set(sid, { totalWeighted: 0, totalCoeff: 0, subjectCount: 0 });
      });

      for (const subjectId of evaluatedSubjectIds) {
        const coef = coefMap.get(subjectId) || 1;
        const subjectExams = examsBySubject.get(subjectId) || [];

        // Distinguish Devoirs vs Exam/Composition
        const devoirExams = subjectExams.filter((e) => {
          const n = (e.examName || "").toLowerCase();
          return (
            n.includes("devoir") ||
            n.includes("interro") ||
            n.includes("test") ||
            n.includes("contrôle") ||
            n.includes("cc") ||
            !n.includes("examen") && !n.includes("composition") && !n.includes("partiel")
          );
        });

        const compositionExams = subjectExams.filter((e) => {
          const n = (e.examName || "").toLowerCase();
          return (
            n.includes("examen") ||
            n.includes("composition") ||
            n.includes("partiel") ||
            n.includes("final")
          );
        });

        for (const student of classStudents) {
          const existingRes = existingResultsMap.get(`${student.id}_${subjectId}`);

          // Collect marks for devoirs
          const devoirsScores: number[] = [];
          devoirExams.slice(0, 5).forEach((de) => {
            const mark = classMarks.find(
              (m) => m.examId === de.id && m.studentId === student.id
            );
            if (mark && mark.marksObtained !== null && mark.marksObtained !== undefined) {
              const normalized = de.maxMarks && de.maxMarks !== 20
                ? (Number(mark.marksObtained) / Number(de.maxMarks)) * 20
                : Number(mark.marksObtained);
              devoirsScores.push(normalized);
            }
          });

          // Check if existing result had devoirs
          if (devoirsScores.length === 0 && existingRes) {
            [existingRes.devoir1, existingRes.devoir2, existingRes.devoir3, existingRes.devoir4, existingRes.devoir5].forEach((d) => {
              if (d !== null && d !== undefined) devoirsScores.push(Number(d));
            });
          }

          const devoirsAvg = devoirsScores.length > 0
            ? Number((devoirsScores.reduce((a, b) => a + b, 0) / devoirsScores.length).toFixed(2))
            : existingRes?.moyenneDevoirs ?? existingRes?.classWorkScore ?? 0;

          // Collect composition / exam score
          let examScore = 0;
          if (compositionExams.length > 0) {
            const compEx = compositionExams[compositionExams.length - 1];
            const compMark = classMarks.find(
              (m) => m.examId === compEx.id && m.studentId === student.id
            );
            if (compMark && compMark.marksObtained !== null && compMark.marksObtained !== undefined) {
              examScore = compEx.maxMarks && compEx.maxMarks !== 20
                ? Number(((Number(compMark.marksObtained) / Number(compEx.maxMarks)) * 20).toFixed(2))
                : Number(Number(compMark.marksObtained).toFixed(2));
            }
          }

          if (examScore === 0 && existingRes?.examScore) {
            examScore = Number(existingRes.examScore);
          }

          // Compute final subject average
          let finalSubjectAverage = 0;
          if (isHigherEd) {
            finalSubjectAverage = examScore > 0 ? examScore : devoirsAvg;
          } else {
            if (devoirsAvg > 0 && examScore > 0) {
              finalSubjectAverage = Number(((devoirsAvg + examScore) / 2).toFixed(2));
            } else if (examScore > 0) {
              finalSubjectAverage = examScore;
            } else {
              finalSubjectAverage = devoirsAvg;
            }
          }

          const weightedScore = Number((finalSubjectAverage * coef).toFixed(2));
          const appreciation = getAppreciationText(finalSubjectAverage);

          // Accumulate in student aggregate
          const agg = studentTermAggregates.get(student.id)!;
          if (finalSubjectAverage > 0 || devoirsScores.length > 0 || examScore > 0) {
            agg.totalWeighted += weightedScore;
            agg.totalCoeff += coef;
            agg.subjectCount += 1;
          }

          // Save or Update in studentResults
          const payload = {
            studentId: student.id,
            subjectId,
            classId,
            sessionId,
            term: periodName,
            devoir1: devoirsScores[0] ?? existingRes?.devoir1 ?? null,
            devoir2: devoirsScores[1] ?? existingRes?.devoir2 ?? null,
            devoir3: devoirsScores[2] ?? existingRes?.devoir3 ?? null,
            devoir4: devoirsScores[3] ?? existingRes?.devoir4 ?? null,
            devoir5: devoirsScores[4] ?? existingRes?.devoir5 ?? null,
            moyenneDevoirs: devoirsAvg,
            classWorkScore: devoirsAvg,
            examScore,
            totalScore: finalSubjectAverage,
            coefficient: coef,
            weightedScore,
            appreciation,
          };

          if (existingRes?.id) {
            await db
              .update(studentResults)
              .set(payload)
              .where(eq(studentResults.id, existingRes.id));
          } else {
            await db.insert(studentResults).values(payload);
          }
          totalResultsInsertedOrUpdated++;
        }
      }

      // 9. Compute Overall Student Term Averages & Ranks
      const rankedStudents = classStudents.map((st) => {
        const agg = studentTermAggregates.get(st.id)!;
        const avg = agg.totalCoeff > 0 ? Number((agg.totalWeighted / agg.totalCoeff).toFixed(2)) : 0;
        return {
          studentId: st.id,
          nomEtudiant: st.nomEtudiant,
          average: avg,
          totalWeighted: agg.totalWeighted,
          totalCoeff: agg.totalCoeff,
        };
      });

      // Sort by average descending
      rankedStudents.sort((a, b) => b.average - a.average);

      const existingSummaries = await (readDb || db).query.studentTermSummaries.findMany({
        where: and(
          eq(studentTermSummaries.classId, classId),
          eq(studentTermSummaries.sessionId, sessionId),
          eq(studentTermSummaries.term, periodName),
          inArray(studentTermSummaries.studentId, studentIds)
        ),
      });
      const existingSummariesMap = new Map<number, number>();
      existingSummaries.forEach((s) => {
        if (s.studentId) existingSummariesMap.set(s.studentId, s.id);
      });

      // Assign ranks with ex-aequo handling
      let currentRank = 1;
      for (let i = 0; i < rankedStudents.length; i++) {
        const st = rankedStudents[i];
        if (i > 0 && st.average < rankedStudents[i - 1].average) {
          currentRank = i + 1;
        }

        const rankStr = currentRank === 1 ? "1er" : `${currentRank}ème`;
        const tableauHonneur = st.average >= 12;
        let decision = "ADMIS";
        if (st.average >= 16) decision = "FÉLICITATIONS DU CONSEIL";
        else if (st.average >= 14) decision = "ENCOURAGEMENTS";
        else if (st.average >= 12) decision = "TABLEAU D'HONNEUR";
        else if (st.average >= 10) decision = "PASSABLE";
        else if (st.average >= 8) decision = "AVERTISSEMENT TRAVAIL";
        else decision = "BLÂME DU CONSEIL";

        const summaryPayload = {
          studentId: st.studentId,
          classId,
          sessionId,
          term: periodName,
          average: st.average,
          rank: rankStr,
          tableauHonneur,
          decision,
        };

        const existingSummaryId = existingSummariesMap.get(st.studentId);
        if (existingSummaryId) {
          await db
            .update(studentTermSummaries)
            .set(summaryPayload)
            .where(eq(studentTermSummaries.id, existingSummaryId));
        } else {
          await db.insert(studentTermSummaries).values(summaryPayload);
        }
      }

      // 10. Class Statistics
      const validAverages = rankedStudents.map((s) => s.average).filter((a) => a > 0);
      const classAverage = validAverages.length > 0
        ? Number((validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(2))
        : 0;
      const highestAverage = validAverages.length > 0 ? Math.max(...validAverages) : 0;
      const lowestAverage = validAverages.length > 0 ? Math.min(...validAverages) : 0;
      const passCount = validAverages.filter((a) => a >= 10).length;
      const passRate = validAverages.length > 0
        ? Number(((passCount / validAverages.length) * 100).toFixed(1))
        : 0;

      // 11. Dispatch in-app notification
      try {
        await db.insert(notifications).values({
          title: `Moyennes calculées : ${cls.className}`,
          content: `Les moyennes et rangs du ${periodName} pour la classe ${cls.className} (${classStudents.length} élèves) ont été consolidés avec succès. Moyenne de classe : ${classAverage}/20 (Taux de réussite : ${passRate}%).`,
          type: "success",
          category: "Scolarité",
          isRead: false,
        });
      } catch {
        // notification non-blocking
      }

      revalidatePath("/dashboard/academics/grades");
      revalidatePath("/dashboard/academics/bulletins-batch");

      return {
        success: true,
        classId,
        className: cls.className,
        term: periodName,
        studentsCount: classStudents.length,
        subjectsCount: evaluatedSubjectIds.length,
        consolidatedResultsCount: totalResultsInsertedOrUpdated,
        classAverage,
        highestAverage,
        lowestAverage,
        passRate,
      };
    } catch (err: any) {
      console.error("[consolidateClassTermGradesAction] Error:", err);
      return {
        success: false,
        classId: options.classId,
        className: "",
        term: options.term || "",
        studentsCount: 0,
        subjectsCount: 0,
        consolidatedResultsCount: 0,
        classAverage: 0,
        highestAverage: 0,
        lowestAverage: 0,
        passRate: 0,
        error: err.message || "Erreur lors de la consolidation des moyennes",
      };
    }
  });
}
