import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "@/app/api/mobile/_lib/auth";
import { db } from "@/infrastructure/database";
import {
  lmsQuizzes,
  lmsQuestions,
  lmsAnswers,
  lmsCertificates,
  lmsCourses,
} from "@/infrastructure/database/schema/lms";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { quizId, answers, studentIdParam } = body;

    const studentId = studentIdParam ? Number(studentIdParam) : user.studentId;
    if (!studentId || !quizId || !answers) {
      return mobileJsonError("studentId, quizId et answers sont requis.", 400);
    }

    // Fetch Quiz with questions and answers
    const quiz = await db.query.lmsQuizzes.findFirst({
      where: eq(lmsQuizzes.id, Number(quizId)),
      with: {
        questions: {
          with: {
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      return mobileJsonError("Quiz introuvable", 404);
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const questionsBreakdown: any[] = [];

    for (const question of quiz.questions) {
      const qPoints = question.points || 2.0;
      totalPoints += qPoints;

      const studentAnswerId = answers[question.id];
      const correctAnswer = question.answers.find((a) => a.isCorrect);

      const isCorrect =
        studentAnswerId != null &&
        question.answers.some((a) => a.id === Number(studentAnswerId) && a.isCorrect);

      if (isCorrect) {
        earnedPoints += qPoints;
      }

      questionsBreakdown.push({
        questionId: question.id,
        questionText: question.questionText,
        points: qPoints,
        earned: isCorrect ? qPoints : 0,
        isCorrect,
        correctAnswerText: correctAnswer?.answerText || "Non spécifié",
        explanation: correctAnswer?.explanation || "",
      });
    }

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passingScore = quiz.passingScore || 10.0;
    const isPassed = (earnedPoints / (totalPoints || 1)) * 20 >= passingScore;

    let certificateCode: string | null = null;

    if (isPassed && quiz.courseId) {
      // Check if certificate already exists
      const existingCert = await db.query.lmsCertificates.findFirst({
        where: and(
          eq(lmsCertificates.studentId, studentId),
          eq(lmsCertificates.courseId, quiz.courseId)
        ),
      });

      if (existingCert) {
        certificateCode = existingCert.certificateCode;
      } else {
        certificateCode = `CERT-${randomUUID().slice(0, 8).toUpperCase()}`;
        await db.insert(lmsCertificates).values({
          courseId: quiz.courseId,
          studentId,
          certificateCode,
          issueDate: new Date(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        quizTitle: quiz.title,
        totalPoints,
        earnedPoints,
        scoreOn20: totalPoints > 0 ? Math.round(((earnedPoints / totalPoints) * 20) * 10) / 10 : 0,
        percentage,
        isPassed,
        passingScore,
        certificateCode,
        questions: questionsBreakdown,
      },
    });
  } catch (error: any) {
    console.error("[LMS Quiz Submit Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la soumission du quiz", 500);
  }
}
