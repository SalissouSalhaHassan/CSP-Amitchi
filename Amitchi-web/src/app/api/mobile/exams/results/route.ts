import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
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

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/mobile/exams/results
//  Query params:
//    studentId  — fetch results for a specific student (used by parent / student)
//    examId     — fetch all results for a single exam (used by teacher / admin)
//    classId    — fetch all results for every exam in a class (admin / teacher)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const sp = request.nextUrl.searchParams;
  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  const isAdmin = [
    "admin", "super_admin", "director", "directeur",
    "general_director", "level_director", "staff",
    "ministere", "dren", "dden", "inspection",
  ].includes(roleType);

  try {
    // ── By examId ─────────────────────────────────────────────────────────────
    const examIdParam = sp.get("examId");
    if (examIdParam) {
      const examId = Number(examIdParam);
      if (!examId) return mobileJsonError("examId invalide", 400);

      const exam = await readDb.query.exams.findFirst({ where: eq(exams.id, examId) });
      if (!exam || (schoolId && exam.schoolId !== schoolId)) {
        return mobileJsonError("Examen introuvable ou accès refusé.", 403);
      }

      // Teachers: verify they're assigned to this exam's class+subject
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
        if (!assignment) return mobileJsonError("Accès refusé. Vous n'enseignez pas cet examen.", 403);
      }

      // Parent: verify exam class matches a child's class
      if (roleType === "parent") {
        const childIds = await getParentChildrenIds(user);
        if (childIds.length === 0) return mobileJsonError("Accès refusé.", 403);
        const childRows = await readDb.query.students.findMany({
          where: inArray(students.id, childIds),
          columns: { classe: true },
        });
        const classNames = [...new Set(childRows.map((c) => c.classe).filter(Boolean))];
        const classRow = exam.classId
          ? await readDb.query.schoolClasses?.findFirst?.({ where: eq((await import("@/infrastructure/database/schema/academics")).schoolClasses.id, exam.classId) })
          : null;
        if (!classRow || !classNames.includes(classRow.className ?? "")) {
          return mobileJsonError("Accès refusé.", 403);
        }
      }

      // Determine which student IDs to include
      let studentIdFilter: number[] | null = null;
      if (roleType === "parent") {
        studentIdFilter = await getParentChildrenIds(user);
      } else if (roleType === "eleve") {
        if (!user.studentId) return mobileJsonError("Accès refusé.", 403);
        studentIdFilter = [user.studentId];
      }

      const resultCond = studentIdFilter
        ? and(eq(examResults.examId, examId), inArray(examResults.studentId, studentIdFilter))
        : eq(examResults.examId, examId);

      const rows = await readDb.query.examResults.findMany({
        where: resultCond,
        with: { student: true },
      });

      return NextResponse.json({
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          exam_id: r.examId,
          student_id: r.studentId,
          marks_obtained: r.marksObtained,
          remarks: r.remarks,
          students: r.student
            ? {
                id: r.student.id,
                nom_etudiant: r.student.nomEtudiant,
                num_admission: r.student.numAdmission,
              }
            : null,
        })),
      });
    }

    // ── By studentId ──────────────────────────────────────────────────────────
    const studentIdParam = sp.get("studentId");
    if (studentIdParam) {
      const studentId = Number(studentIdParam);
      if (!studentId) return mobileJsonError("studentId invalide", 400);

      // Verify access to this student
      if (!isAdmin) {
        if (roleType === "teacher" || roleType === "enseignant") {
          // Teacher can only pull results for students in their classes
          const student = await readDb.query.students.findFirst({
            where: eq(students.id, studentId),
            columns: { classe: true, schoolId: true },
          });
          if (!student || (schoolId && student.schoolId !== schoolId)) {
            return mobileJsonError("Accès refusé.", 403);
          }
          const assignments = user.employeeId
            ? await readDb.query.classSubjects.findMany({
                where: eq(classSubjects.employeeId, user.employeeId),
                with: { class: true },
              })
            : [];
          const allowedClasses = new Set(assignments.map((a) => a.class?.className).filter(Boolean));
          if (!allowedClasses.has(student.classe ?? "")) {
            return mobileJsonError("Accès refusé. Cet élève n'est pas dans votre classe.", 403);
          }
        } else if (roleType === "parent") {
          const childIds = await getParentChildrenIds(user);
          if (!childIds.includes(studentId)) {
            return mobileJsonError("Accès refusé. Cet élève ne fait pas partie de vos enfants.", 403);
          }
        } else if (roleType === "eleve") {
          if (user.studentId !== studentId) {
            return mobileJsonError("Accès refusé. Vous ne pouvez voir que vos propres résultats.", 403);
          }
        } else {
          return mobileJsonError("Accès refusé.", 403);
        }
      }

      const rows = await readDb.query.examResults.findMany({
        where: and(
          eq(examResults.studentId, studentId),
          ...(schoolId ? [eq(examResults.schoolId, schoolId)] : [])
        ),
        with: {
          exam: {
            with: { class: true, subject: true, period: true },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: rows.map((r) => ({
          id: r.id,
          exam_id: r.examId,
          student_id: r.studentId,
          marks_obtained: r.marksObtained,
          remarks: r.remarks,
          exams: r.exam
            ? {
                id: r.exam.id,
                exam_name: r.exam.examName,
                max_marks: r.exam.maxMarks,
                exam_date: r.exam.examDate?.toISOString() ?? null,
                school_classes: r.exam.class ? { class_name: r.exam.class.className } : null,
                school_subjects: r.exam.subject ? { subject_name: r.exam.subject.subjectName } : null,
                academic_periods: r.exam.period ? { name: r.exam.period.name } : null,
              }
            : null,
        })),
      });
    }

    return mobileJsonError("Paramètre examId ou studentId requis", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/mobile/exams/results
//  Save a single exam result (one student — used for quick entry)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // Only teachers and admins can save results
  const canWrite = [
    "admin", "super_admin", "director", "directeur",
    "general_director", "level_director", "staff",
    "teacher", "enseignant",
  ].includes(roleType);

  if (!canWrite) {
    return mobileJsonError("Accès refusé. Écriture non autorisée.", 403);
  }

  try {
    const body = await request.json();
    const { examId, studentId, marksObtained, remarks } = body;

    if (!examId || !studentId) return mobileJsonError("examId et studentId requis", 400);

    const exam = await readDb.query.exams.findFirst({ where: eq(exams.id, examId) });
    if (!exam || (schoolId && exam.schoolId !== schoolId)) {
      return mobileJsonError("Examen introuvable ou accès refusé.", 403);
    }

    // Teacher must be assigned to this exam's class+subject
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
      if (!assignment) return mobileJsonError("Accès refusé. Vous n'êtes pas assigné à cet examen.", 403);
    }

    const existing = await readDb.query.examResults.findFirst({
      where: and(eq(examResults.examId, examId), eq(examResults.studentId, studentId)),
    });

    if (existing) {
      await db
        .update(examResults)
        .set({ marksObtained: marksObtained ?? null, remarks: remarks ?? null })
        .where(eq(examResults.id, existing.id));
    } else {
      await db.insert(examResults).values({
        examId,
        studentId,
        schoolId,
        marksObtained: marksObtained ?? null,
        remarks: remarks ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
