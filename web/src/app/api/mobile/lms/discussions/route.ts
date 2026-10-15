import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import { lmsDiscussions, lmsCourses, lmsLessons } from "@/infrastructure/database/schema/lms";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, desc, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") ? Number(searchParams.get("courseId")) : null;
    const lessonId = searchParams.get("lessonId") ? Number(searchParams.get("lessonId")) : null;

    const whereClause = lessonId
      ? eq(lmsDiscussions.lessonId, lessonId)
      : courseId
      ? eq(lmsDiscussions.courseId, courseId)
      : undefined;

    const messages = await db.query.lmsDiscussions.findMany({
      where: whereClause,
      with: {
        student: true,
        employee: true,
        course: true,
        lesson: true,
      },
      orderBy: [desc(lmsDiscussions.createdAt)],
      limit: 60,
    });

    const enriched = messages.map((m) => {
      const isTeacher = !!m.employeeId;
      const authorName = isTeacher
        ? (m.employee?.nom ? `Prof. ${m.employee.nom}` : "Enseignant")
        : m.student?.nomEtudiant || "Utilisateur";

      return {
        id: m.id,
        courseId: m.courseId,
        courseTitle: m.course?.title || "Général",
        lessonId: m.lessonId,
        lessonTitle: m.lesson?.title || null,
        message: m.message,
        parentId: m.parentId,
        createdAt: m.createdAt,
        isTeacher,
        authorName,
        authorRole: isTeacher ? "Enseignant" : "Élève",
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (e: any) {
    console.error("[LMS Discussions API Error]:", e);
    return mobileJsonError(e?.message || "Erreur serveur discussions", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const message = body.message?.toString().trim();
    const courseId = body.courseId ? Number(body.courseId) : null;
    const lessonId = body.lessonId ? Number(body.lessonId) : null;
    const parentId = body.parentId ? Number(body.parentId) : null;

    if (!message) {
      return mobileJsonError("Le message ne peut pas être vide.", 400);
    }

    const studentId = user.studentId || (body.studentIdParam ? Number(body.studentIdParam) : null);
    const employeeId = user.employeeId || null;

    const [inserted] = await db
      .insert(lmsDiscussions)
      .values({
        courseId,
        lessonId,
        studentId: employeeId ? null : studentId,
        employeeId: employeeId || null,
        message,
        parentId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted,
      message: "Message publié avec succès",
    });
  } catch (e: any) {
    console.error("[LMS Discussions POST Error]:", e);
    return mobileJsonError(e?.message || "Erreur lors de la publication du message", 500);
  }
}
