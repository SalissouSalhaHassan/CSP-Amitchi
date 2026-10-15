import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql, or, ilike, isNull } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import {
  exams,
  examResults,
  schoolClasses,
  schoolSubjects,
  schoolSessions,
  academicPeriods,
  classSubjects,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { getUserRoleType, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";
import { getParentChildrenIds } from "../_lib/family-auth";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
//  Helper: build exam-scoped where conditions
// ─────────────────────────────────────────────
async function buildExamScope(user: any, roleType: string) {
  const schoolId = user.schoolId;

  /** Base conditions applied to every role */
  const baseCond = schoolId ? [eq(exams.schoolId, schoolId)] : [];

  // ADMIN / DIRECTOR / STAFF — see everything in their school
  const isAdmin = [
    "admin", "super_admin", "director", "directeur",
    "general_director", "level_director", "staff",
    "ministere", "dren", "dden", "inspection",
  ].includes(roleType);

  if (isAdmin) {
    return { cond: baseCond, classIds: null, studentIds: null };
  }

  // TEACHER — only exams for classes & subjects they teach
  if (roleType === "teacher" || roleType === "enseignant") {
    if (!user.employeeId) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: null };
    const assignments = await readDb.query.classSubjects.findMany({
      where: eq(classSubjects.employeeId, user.employeeId),
      columns: { classId: true, subjectId: true },
    });
    if (assignments.length === 0) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: null };

    // Filter at query level: classId IN (...) AND subjectId IN (...)
    const classIds = [...new Set(assignments.map((a) => a.classId).filter(Boolean))] as number[];
    const subjectIds = [...new Set(assignments.map((a) => a.subjectId).filter(Boolean))] as number[];

    const teacherCond = [
      ...baseCond,
      inArray(exams.classId, classIds),
      inArray(exams.subjectId, subjectIds),
    ];
    return { cond: teacherCond, classIds, studentIds: null };
  }

  // PARENT — exams linked to their children's classes
  if (roleType === "parent") {
    const childIds = await getParentChildrenIds(user);
    if (childIds.length === 0) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: childIds };

    const childRows = await readDb.query.students.findMany({
      where: inArray(students.id, childIds),
      columns: { classe: true },
    });
    const classNames = [...new Set(childRows.map((c) => c.classe).filter(Boolean))] as string[];
    if (classNames.length === 0) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: childIds };

    // Resolve class names → class IDs
    const classRows = await readDb.query.schoolClasses.findMany({
      where: and(
        schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
        inArray(schoolClasses.className, classNames)
      ),
      columns: { id: true },
    });
    const classIds = classRows.map((c) => c.id) as number[];
    if (classIds.length === 0) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: childIds };

    return { cond: [...baseCond, inArray(exams.classId, classIds)], classIds, studentIds: childIds };
  }

  // STUDENT — exams for their own class only
  if (roleType === "eleve") {
    const studentId = user.studentId;
    if (!studentId) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: null };

    const studentRow = await readDb.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { classe: true },
    });
    if (!studentRow?.classe) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: [studentId] };

    const classRow = await readDb.query.schoolClasses.findFirst({
      where: and(
        schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
        eq(schoolClasses.className, studentRow.classe)
      ),
      columns: { id: true },
    });
    if (!classRow) return { cond: [eq(exams.id, -1)], classIds: null, studentIds: [studentId] };

    return {
      cond: [...baseCond, eq(exams.classId, classRow.id)],
      classIds: [classRow.id],
      studentIds: [studentId],
    };
  }

  // Default: deny
  return { cond: [eq(exams.id, -1)], classIds: null, studentIds: null };
}

// ─────────────────────────────────────────────
//  GET
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  if (!action) return mobileJsonError("Action manquante", 400);

  const roleType = await getUserRoleType(user);
  const schoolId = user.schoolId;

  try {
    // ── getExamsList ──────────────────────────────────────────────────────────
    if (action === "getExamsList") {
      const { cond } = await buildExamScope(user, roleType);

      const rows = await readDb.query.exams.findMany({
        where: cond.length > 0 ? and(...cond) : undefined,
        with: { class: true, subject: true, period: true },
        orderBy: [sql`created_at DESC`],
      });

      const list = rows.map((exam) => ({
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
      }));

      return NextResponse.json({ success: true, data: list });
    }

    // ── getExamFormOptions ────────────────────────────────────────────────────
    if (action === "getExamFormOptions") {
      // Teachers only get their assigned classes/subjects
      const { classIds } = await buildExamScope(user, roleType);

      const classCond = schoolId ? [eq(schoolClasses.schoolId, schoolId)] : [];
      let classesRows = await readDb.query.schoolClasses.findMany({
        where: and(
          ...classCond,
          classIds ? inArray(schoolClasses.id, classIds) : undefined
        ),
        with: {
          section: true,
        },
        orderBy: [schoolClasses.className],
      });

      // Educational level scoping for Directors / Level Directors
      const userLevel = user.educationalLevel;
      if (userLevel && !hasAllEducationalLevels(userLevel)) {
        classesRows = classesRows.filter((c) =>
          isStudentInEducationalLevel(
            {
              educationalLevel: c.section?.educationalLevel,
              classe: c.className,
              sectionName: c.section?.sectionName,
            },
            userLevel
          )
        );
      }

      const subjectsCond = schoolId ? [eq(schoolSubjects.schoolId, schoolId)] : [];
      const subjectsRows = await readDb.query.schoolSubjects.findMany({
        where: subjectsCond.length > 0 ? and(...subjectsCond) : undefined,
        orderBy: [schoolSubjects.subjectName],
      });

      const sessCond = schoolId ? [eq(schoolSessions.schoolId, schoolId)] : [];
      const sessionsRows = await readDb.query.schoolSessions.findMany({
        where: sessCond.length > 0 ? and(...sessCond) : undefined,
        orderBy: [
          sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
          sql`id DESC`
        ],
      });

      let periodsList: any[] = [];
      if (sessionsRows.length > 0) {
        const activeSession =
          sessionsRows.find((r) => r.isActive || r.status?.toLowerCase() === "actif") ?? sessionsRows[0]!;
        periodsList = await readDb.query.academicPeriods.findMany({
          where: eq(academicPeriods.sessionId, activeSession.id),
          orderBy: [
            sql`CASE WHEN is_active = TRUE THEN 0 ELSE 1 END`,
            academicPeriods.id
          ],
        });
      }

      return NextResponse.json({
        success: true,
        classes: classesRows.map((c) => ({
          id: c.id,
          class_name: c.className,
          educational_level: c.section?.educationalLevel ?? null,
          section_name: c.section?.sectionName ?? null,
        })),
        subjects: subjectsRows.map((s) => ({ id: s.id, subject_name: s.subjectName })),
        periods: periodsList.map((p) => ({ id: p.id, name: p.name })),
      });
    }

    // ── getExamResults ────────────────────────────────────────────────────────
    if (action === "getExamResults") {
      const examId = Number(searchParams.get("examId"));
      if (!examId) return mobileJsonError("examId manquant", 400);

      // Verify the exam belongs to the user's scope
      const exam = await readDb.query.exams.findFirst({ where: eq(exams.id, examId) });
      if (!exam || (schoolId && exam.schoolId !== schoolId)) {
        return mobileJsonError("Accès refusé. Examen introuvable.", 403);
      }

      const { studentIds } = await buildExamScope(user, roleType);

      let resultCond: any = eq(examResults.examId, examId);
      if (studentIds && studentIds.length > 0) {
        resultCond = and(eq(examResults.examId, examId), inArray(examResults.studentId, studentIds));
      }

      const rows = await readDb.query.examResults.findMany({
        where: resultCond,
        with: { student: true },
      });

      const list = rows.map((r) => ({
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
      }));

      return NextResponse.json({ success: true, data: list });
    }

    // ── getStudentsForExam ────────────────────────────────────────────────────
    if (action === "getStudentsForExam") {
      const classId = Number(searchParams.get("classId"));
      if (!classId) return mobileJsonError("classId manquant", 400);

      // Teachers must be assigned to this class
      if (roleType === "teacher" || roleType === "enseignant") {
        const assignment = user.employeeId
          ? await readDb.query.classSubjects.findFirst({
              where: and(
                eq(classSubjects.employeeId, user.employeeId),
                eq(classSubjects.classId, classId)
              ),
            })
          : null;
        if (!assignment) return mobileJsonError("Accès refusé. Vous n'enseignez pas dans cette classe.", 403);
      }

      const classRes = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
      });
      if (!classRes) return mobileJsonError("Classe introuvable", 404);

      const cond = [
        or(
          eq(students.classe, classRes.className),
          ilike(students.classe, `%${classRes.className.trim()}%`)
        ),
        or(
          eq(students.statut, "Actif"),
          eq(students.statut, "Inscrit"),
          isNull(students.statut),
          ilike(students.statut, "actif%")
        ),
        ...(schoolId ? [eq(students.schoolId, schoolId)] : []),
      ];

      const rows = await readDb.query.students.findMany({
        where: and(...cond),
        orderBy: [students.nomEtudiant],
      });

      const list = rows.map((s) => ({
        id: s.id,
        nom_etudiant: s.nomEtudiant,
        num_admission: s.numAdmission,
        classe: s.classe,
        statut: s.statut,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

// ─────────────────────────────────────────────
//  POST (create / update / delete / save results)
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // Parents and students cannot write exams
  if (roleType === "parent" || roleType === "eleve") {
    return mobileJsonError("Accès refusé. Écriture non autorisée pour ce rôle.", 403);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;
    if (!action || !payload) return mobileJsonError("Paramètres manquants", 400);

    // ── saveBatchExamResults ─────────────────────────────────────────────────
    if (action === "saveBatchExamResults") {
      const { examId, results } = payload;
      if (!examId || !results || !Array.isArray(results)) {
        return mobileJsonError("Paramètres invalides", 400);
      }

      const exam = await readDb.query.exams.findFirst({ where: eq(exams.id, examId) });
      if (!exam || (schoolId && exam.schoolId !== schoolId)) {
        return mobileJsonError("Accès refusé.", 403);
      }

      // Teachers can only save results for their assigned classes/subjects
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
        if (!assignment) return mobileJsonError("Accès refusé. Vous n'enseignez pas cette matière dans cette classe.", 403);
      }

      const existing = await readDb.query.examResults.findMany({
        where: eq(examResults.examId, examId),
      });
      const existingMap = new Map(existing.map((r) => [r.studentId, r.id]));

      await Promise.all(
        results.map(async (item: any) => {
          const studentId = Number(item.student_id);
          const marksObtained =
            item.marks_obtained !== null && item.marks_obtained !== undefined
              ? Number(item.marks_obtained)
              : null;
          const remarks = item.remarks ? String(item.remarks) : null;
          const existingId = existingMap.get(studentId);

          if (existingId) {
            await db
              .update(examResults)
              .set({ marksObtained, remarks })
              .where(eq(examResults.id, existingId));
          } else {
            await db.insert(examResults).values({
              examId,
              studentId,
              schoolId,
              marksObtained,
              remarks,
            });
          }
        })
      );

      return NextResponse.json({ success: true });
    }

    // ── createExam ───────────────────────────────────────────────────────────
    if (action === "createExam") {
      // Teachers must own the class+subject
      if (roleType === "teacher" || roleType === "enseignant") {
        const assignment = user.employeeId
          ? await readDb.query.classSubjects.findFirst({
              where: and(
                eq(classSubjects.employeeId, user.employeeId),
                eq(classSubjects.classId, Number(payload.class_id)),
                eq(classSubjects.subjectId, Number(payload.subject_id))
              ),
            })
          : null;
        if (!assignment) return mobileJsonError("Accès refusé. Vous n'êtes pas assigné à cette combinaison classe/matière.", 403);
      }

      await db.insert(exams).values({
        schoolId,
        examName: String(payload.exam_name),
        classId: Number(payload.class_id),
        subjectId: Number(payload.subject_id),
        examDate: payload.exam_date ? new Date(payload.exam_date) : null,
        periodId: Number(payload.period_id),
        maxMarks: payload.max_marks ? Number(payload.max_marks) : 20,
      });
      return NextResponse.json({ success: true });
    }

    // ── updateExam ───────────────────────────────────────────────────────────
    if (action === "updateExam") {
      const { examId } = payload;
      if (!examId) return mobileJsonError("examId manquant", 400);

      const exam = await readDb.query.exams.findFirst({ where: eq(exams.id, examId) });
      if (!exam || (schoolId && exam.schoolId !== schoolId)) {
        return mobileJsonError("Accès refusé.", 403);
      }

      if (roleType === "teacher" || roleType === "enseignant") {
        const assignment = user.employeeId
          ? await readDb.query.classSubjects.findFirst({
              where: and(
                eq(classSubjects.employeeId, user.employeeId),
                eq(classSubjects.classId, exam.classId ?? -1)
              ),
            })
          : null;
        if (!assignment) return mobileJsonError("Accès refusé.", 403);
      }

      await db.update(exams).set({
        ...(payload.exam_name ? { examName: String(payload.exam_name) } : {}),
        ...(payload.class_id ? { classId: Number(payload.class_id) } : {}),
        ...(payload.subject_id ? { subjectId: Number(payload.subject_id) } : {}),
        ...(payload.exam_date ? { examDate: new Date(payload.exam_date) } : {}),
        ...(payload.period_id ? { periodId: Number(payload.period_id) } : {}),
        ...(payload.max_marks ? { maxMarks: Number(payload.max_marks) } : {}),
      }).where(eq(exams.id, examId));

      return NextResponse.json({ success: true });
    }

    // ── deleteExam ───────────────────────────────────────────────────────────
    if (action === "deleteExam") {
      const { examId } = payload;
      if (!examId) return mobileJsonError("examId manquant", 400);

      const exam = await readDb.query.exams.findFirst({ where: eq(exams.id, examId) });
      if (!exam || (schoolId && exam.schoolId !== schoolId)) {
        return mobileJsonError("Accès refusé.", 403);
      }

      if (roleType === "teacher" || roleType === "enseignant") {
        const assignment = user.employeeId
          ? await readDb.query.classSubjects.findFirst({
              where: and(
                eq(classSubjects.employeeId, user.employeeId),
                eq(classSubjects.classId, exam.classId ?? -1)
              ),
            })
          : null;
        if (!assignment) return mobileJsonError("Accès refusé.", 403);
      }

      await db.delete(exams).where(eq(exams.id, examId));
      return NextResponse.json({ success: true });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
