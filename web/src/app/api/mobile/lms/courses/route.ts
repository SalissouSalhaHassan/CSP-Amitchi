import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import {
  lmsCourses,
  lmsModules,
  lmsLessons,
  lmsQuizzes,
  lmsQuestions,
  lmsAnswers,
  lmsProgress,
} from "@/infrastructure/database/schema/lms";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");
    const courseIdParam = searchParams.get("courseId");

    let studentId = user.studentId;
    if (studentIdParam) {
      studentId = Number(studentIdParam);
    }

    // Lookup student to get their classId
    let classId: number | null = null;
    if (studentId) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
      classId = student?.classId || null;
    }

    if (courseIdParam) {
      // Return full course details with modules, lessons, and student progress
      const course = await db.query.lmsCourses.findFirst({
        where: eq(lmsCourses.id, Number(courseIdParam)),
        with: {
          subject: true,
          modules: {
            with: {
              lessons: true,
            },
            orderBy: (m, { asc }) => [asc(m.displayOrder)],
          },
          quizzes: {
            with: {
              questions: {
                with: {
                  answers: true,
                },
                orderBy: (q, { asc }) => [asc(q.displayOrder)],
              },
            },
          },
        },
      });

      if (!course) {
        return mobileJsonError("Cours introuvable", 404);
      }

      // Fetch progress for this student
      let progressRecords: any[] = [];
      if (studentId) {
        progressRecords = await db.query.lmsProgress.findMany({
          where: eq(lmsProgress.studentId, studentId),
        });
      }

      const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

      // Calculate total lessons and completed lessons
      let totalLessons = 0;
      let completedLessons = 0;

      const enrichedModules = course.modules.map((mod) => {
        const enrichedLessons = mod.lessons.map((lesson) => {
          totalLessons++;
          const prog = progressMap.get(lesson.id);
          if (prog?.isCompleted) completedLessons++;
          return {
            ...lesson,
            isCompleted: prog?.isCompleted || false,
            lastPosition: prog?.lastPosition || 0,
            personalNotes: prog?.personalNotes || "",
          };
        });
        return {
          ...mod,
          lessons: enrichedLessons,
        };
      });

      const completionPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return NextResponse.json({
        success: true,
        data: {
          ...course,
          modules: enrichedModules,
          completionPercentage,
          totalLessons,
          completedLessons,
        },
      });
    }

    // Return list of available courses
    const allCourses = await db.query.lmsCourses.findMany({
      where: classId ? eq(lmsCourses.classId, classId) : undefined,
      with: {
        subject: true,
        modules: {
          with: {
            lessons: true,
          },
        },
      },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: allCourses,
    });
  } catch (error: any) {
    console.error("[LMS Courses API Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors du chargement des cours", 500);
  }
}
