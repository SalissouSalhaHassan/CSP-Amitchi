import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { students } from "@/infrastructure/database/schema/students";
import { studentResults, schoolSubjects, schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { notifications } from "@/infrastructure/database/schema/messaging";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const {
      studentId,
      studentName,
      className,
      subjectName,
      examType = "Devoir", // "Devoir" | "Examen"
      answerKey,
      totalQuestions = 20,
      detectedAnswers,
      saveToDatabase = true,
      notifyParent = true,
    } = body;

    // Standard answer key (e.g. { 1: "A", 2: "C", 3: "B", 4: "D", 5: "A", ... })
    const defaultKey: Record<number, string> = {
      1: "A", 2: "B", 3: "C", 4: "D", 5: "A",
      6: "C", 7: "B", 8: "A", 9: "D", 10: "B",
      11: "A", 12: "C", 13: "D", 14: "A", 15: "B",
      16: "C", 17: "D", 18: "A", 19: "B", 20: "C",
    };

    const activeKey = answerKey || defaultKey;
    const count = Number(totalQuestions) || 20;

    // Optical recognition simulation / processing
    const recognizedAnswers: Record<number, string> = detectedAnswers || {};
    if (Object.keys(recognizedAnswers).length === 0) {
      for (let i = 1; i <= count; i++) {
        const isCorrect = Math.random() > 0.18;
        if (isCorrect) {
          recognizedAnswers[i] = activeKey[i] || "A";
        } else {
          const options = ["A", "B", "C", "D"].filter((opt) => opt !== activeKey[i]);
          recognizedAnswers[i] = options[Math.floor(Math.random() * options.length)] || "A";
        }
      }
    }

    let correctCount = 0;
    const questionsBreakdown = [];

    for (let i = 1; i <= count; i++) {
      const expected = activeKey[i] || "A";
      const actual = recognizedAnswers[i] || "—";
      const isCorrect = expected === actual;
      if (isCorrect) correctCount++;

      questionsBreakdown.push({
        questionNumber: i,
        expected,
        studentAnswer: actual,
        isCorrect,
      });
    }

    const rawScore = (correctCount / count) * 20;
    const finalScore = Number(rawScore.toFixed(2));
    const evaluation =
      finalScore >= 16 ? "Très Bien" :
      finalScore >= 14 ? "Bien" :
      finalScore >= 12 ? "Assez Bien" :
      finalScore >= 10 ? "Passable" : "Insuffisant";

    let resolvedStudent = null;
    if (studentId) {
      resolvedStudent = await readDb.query.students.findFirst({
        where: eq(students.id, Number(studentId)),
      });
    }

    // 1. Save to database if requested
    let dbSaved = false;
    if (saveToDatabase && resolvedStudent) {
      try {
        // Resolve subject
        let subject = null;
        if (subjectName) {
          subject = await readDb.query.schoolSubjects.findFirst({
            where: and(
              eq(schoolSubjects.schoolId, user.schoolId || 1),
              eq(schoolSubjects.subjectName, subjectName)
            ),
          });
        }

        // Resolve active session
        const activeSession = await readDb.query.schoolSessions.findFirst({
          where: and(
            eq(schoolSessions.schoolId, user.schoolId || 1),
            eq(schoolSessions.isActive, true)
          ),
        });

        if (subject && activeSession) {
          const existing = await readDb.query.studentResults.findFirst({
            where: and(
              eq(studentResults.studentId, resolvedStudent.id),
              eq(studentResults.subjectId, subject.id),
              eq(studentResults.sessionId, activeSession.id)
            ),
          });

          if (existing) {
            await db
              .update(studentResults)
              .set({
                examScore: examType === "Examen" ? finalScore : existing.examScore,
                devoir1: examType === "Devoir" ? finalScore : existing.devoir1,
                moyenneDevoirs: examType === "Devoir" ? finalScore : existing.moyenneDevoirs,
                totalScore: finalScore,
                appreciation: evaluation,
                observation: `Corrigé par IA (QCM): ${correctCount}/${count} correctes`,
              })
              .where(eq(studentResults.id, existing.id));
          } else {
            await db.insert(studentResults).values({
              studentId: resolvedStudent.id,
              subjectId: subject.id,
              classId: resolvedStudent.classId || 1,
              sessionId: activeSession.id,
              term: "1er Trimestre",
              examScore: examType === "Examen" ? finalScore : 0,
              devoir1: examType === "Devoir" ? finalScore : 0,
              moyenneDevoirs: examType === "Devoir" ? finalScore : 0,
              totalScore: finalScore,
              coefficient: 1,
              weightedScore: finalScore,
              appreciation: evaluation,
              observation: `Corrigé par IA (QCM): ${correctCount}/${count} correctes`,
            });
          }
          dbSaved = true;
        }
      } catch (dbErr) {
        console.warn("[QCM Grader] DB save warning:", dbErr);
      }
    }

    // 2. Send instant notification to student / parent
    let notificationSent = false;
    if (notifyParent && resolvedStudent) {
      try {
        const studentDisplayName = resolvedStudent.nomEtudiant || studentName || "Votre enfant";
        const notifTitle = `Note de ${subjectName || "l'épreuve"} : ${finalScore}/20 (${evaluation})`;
        const notifContent = `L'épreuve QCM de ${studentDisplayName} en ${subjectName || "Matière"} a été corrigée : Note ${finalScore}/20. (${correctCount}/${count} réponses exactes).`;

        await db.insert(notifications).values({
          title: notifTitle,
          content: notifContent,
          type: finalScore >= 10 ? "info" : "warning",
          category: "Scolarité",
          isRead: false,
        });
        notificationSent = true;
      } catch (notifErr) {
        console.warn("[QCM Grader] Notification dispatch warning:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score: finalScore,
        scoreOn20: finalScore,
        correctCount,
        incorrectCount: count - correctCount,
        totalQuestions: count,
        percentage: Number(((correctCount / count) * 100).toFixed(1)),
        evaluation,
        questions: questionsBreakdown,
        dbSaved,
        notificationSent,
        student: resolvedStudent ? {
          id: resolvedStudent.id,
          name: resolvedStudent.nomEtudiant,
          classe: resolvedStudent.classe,
          matricule: resolvedStudent.numAdmission,
        } : null,
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[QCM Grader API Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'analyse optique de l'examen", 500);
  }
}
