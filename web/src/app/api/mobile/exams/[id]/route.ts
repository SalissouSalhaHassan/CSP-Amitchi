import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import {
  exams,
  examResults,
  classSubjects,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { getParentChildrenIds } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const examId = Number(params.id);
  if (!examId) return mobileJsonError("examId invalide", 400);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    const exam = await readDb.query.exams.findFirst({
      where: eq(exams.id, examId),
      with: { class: true, subject: true, period: true },
    });

    if (!exam) return mobileJsonError("Examen introuvable", 404);

    // 1. Enforce school boundary
    if (schoolId && exam.schoolId !== schoolId) {
      return mobileJsonError("Accès refusé. Cet examen appartient à un autre établissement.", 403);
    }

    // 2. Enforce role scope
    const isAdmin = [
      "admin", "super_admin", "director", "directeur",
      "general_director", "level_director", "staff",
      "ministere", "dren", "dden", "inspection",
    ].includes(roleType);

    if (!isAdmin) {
      if (roleType === "teacher" || roleType === "enseignant") {
        const assignment = user.employeeId
          ? await readDb.query.classSubjects.findFirst({
              where: and(
                eq(classSubjects.employeeId, user.employeeId),
                eq(classSubjects.classId, exam.classId ?? -1),
                eq(classSubjects.subjectId, exam.subjectId ?? -1)
              ),
            })
          : null;
        if (!assignment) {
          return mobileJsonError("Accès refusé. Vous n'êtes pas assigné à cet examen.", 403);
        }
      } else if (roleType === "parent") {
        const childIds = await getParentChildrenIds(user);
        if (childIds.length === 0) return mobileJsonError("Accès refusé.", 403);

        const childRows = await readDb.query.students.findMany({
          where: inArray(students.id, childIds),
          columns: { classe: true },
        });
        const classNames = [...new Set(childRows.map((c) => c.classe).filter(Boolean))];
        if (!classNames.includes(exam.class?.className ?? "")) {
          return mobileJsonError("Accès refusé. Cet examen n'appartient pas à la classe de vos enfants.", 403);
        }
      } else if (roleType === "eleve") {
        const studentId = user.studentId;
        if (!studentId) return mobileJsonError("Accès refusé.", 403);

        const studentRow = await readDb.query.students.findFirst({
          where: eq(students.id, studentId),
          columns: { classe: true },
        });
        if (!studentRow?.classe || studentRow.classe !== exam.class?.className) {
          return mobileJsonError("Accès refusé. Cet examen n'est pas pour votre classe.", 403);
        }
      } else {
        return mobileJsonError("Accès refusé.", 403);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: exam.id,
        school_id: exam.schoolId,
        exam_name: exam.examName,
        class_id: exam.classId,
        subject_id: exam.subjectId,
        exam_date: exam.examDate?.toISOString() ?? null,
        period_id: exam.periodId,
        max_marks: exam.maxMarks,
        created_at: exam.createdAt?.toISOString() ?? null,
        school_classes: exam.class ? { class_name: exam.class.className } : null,
        school_subjects: exam.subject ? { subject_name: exam.subject.subjectName } : null,
        academic_periods: exam.period ? { name: exam.period.name } : null,
      },
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
