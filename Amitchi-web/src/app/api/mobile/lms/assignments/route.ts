import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { db } from "@/infrastructure/database";
import {
  lmsAssignments,
  lmsSubmissions,
  lmsCourses,
} from "@/infrastructure/database/schema/lms";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, desc, or, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get("studentId");
    let studentId = user.studentId;
    if (studentIdParam) {
      studentId = Number(studentIdParam);
    }

    let classId: number | null = null;
    if (studentId) {
      const student = await db.query.students.findFirst({
        where: eq(students.id, studentId),
      });
      classId = student?.classId || null;
    }

    const whereCondition = classId
      ? or(eq(lmsAssignments.classId, classId), isNull(lmsAssignments.classId))
      : undefined;

    const assignments = await db.query.lmsAssignments.findMany({
      where: whereCondition,
      with: {
        course: true,
        subject: true,
      },
      orderBy: [desc(lmsAssignments.dueDate)],
    });

    let submissions: any[] = [];
    if (studentId) {
      submissions = await db.query.lmsSubmissions.findMany({
        where: eq(lmsSubmissions.studentId, studentId),
      });
    }

    const submissionMap = new Map(submissions.map((s) => [s.assignmentId, s]));

    const enriched = assignments.map((a) => {
      const mySub = submissionMap.get(a.id);
      return {
        ...a,
        courseTitle: a.course?.title || "Cours",
        subjectName: a.subject?.subjectName || "Matière",
        submission: mySub
          ? {
              id: mySub.id,
              submittedAt: mySub.submittedAt,
              isGraded: mySub.isGraded,
              score: mySub.score,
              comment: mySub.comment,
              fileReponsePath: mySub.fileReponsePath,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (e: any) {
    console.error("[LMS Assignments API Error]:", e);
    return mobileJsonError(e?.message || "Erreur serveur", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const assignmentId = Number(body.assignmentId);
    let studentId = user.studentId || Number(body.studentIdParam);
    const textResponse = body.textResponse || body.comment || "";
    const fileReponsePath = body.fileReponsePath || null;

    if (!assignmentId || !studentId) {
      return mobileJsonError("Paramètres manquants (assignmentId, studentId)", 400);
    }

    const existing = await db.query.lmsSubmissions.findFirst({
      where: and(
        eq(lmsSubmissions.assignmentId, assignmentId),
        eq(lmsSubmissions.studentId, studentId)
      ),
    });

    if (existing) {
      await db
        .update(lmsSubmissions)
        .set({
          fileReponsePath: fileReponsePath || existing.fileReponsePath,
          comment: textResponse || existing.comment,
          submittedAt: new Date(),
        })
        .where(eq(lmsSubmissions.id, existing.id));
    } else {
      await db.insert(lmsSubmissions).values({
        assignmentId,
        studentId,
        fileReponsePath,
        comment: textResponse,
        isGraded: false,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Devoir remis avec succès !",
    });
  } catch (e: any) {
    return mobileJsonError(e?.message || "Erreur remise de devoir", 500);
  }
}
