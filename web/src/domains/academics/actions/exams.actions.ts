"use server";

import { db } from "@/infrastructure/database";
import { exams, examResults, schoolClasses, schoolSubjects, academicPeriods, schoolSessions, schoolSections, classSubjects } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { pedagogieRemediation } from "@/infrastructure/database/schema/pedagogie";
import { lmsAssignments } from "@/infrastructure/database/schema/lms";
import { eq, desc, and, inArray, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { examSchema, batchExamResultSchema, ExamFormData, BatchExamResultFormData } from "../validators/exams.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getCompatibleLevels, getTeacherEmployee, getTeacherClassIds, verifyTeacherClassAccess, verifyTeacherClassSubjectAccess } from "@/domains/auth/services/rbac";

// --- Exams ---
export async function getExams(filters?: { classId?: number; subjectId?: number; periodName?: string }) {
  return protectedDbAction("Exams", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    
    let query = db.select({
      id: exams.id,
      examName: exams.examName,
      classId: exams.classId,
      subjectId: exams.subjectId,
      examDate: exams.examDate,
      periodId: exams.periodId,
      maxMarks: exams.maxMarks,
      createdAt: exams.createdAt,
      class: {
        id: schoolClasses.id,
        className: schoolClasses.className,
      },
      subject: {
        id: schoolSubjects.id,
        subjectName: schoolSubjects.subjectName,
      },
      period: {
        id: academicPeriods.id,
        name: academicPeriods.name,
      }
    })
    .from(exams)
    .leftJoin(schoolClasses, eq(exams.classId, schoolClasses.id))
    .leftJoin(schoolSubjects, eq(exams.subjectId, schoolSubjects.id))
    .leftJoin(academicPeriods, eq(exams.periodId, academicPeriods.id))
    .leftJoin(schoolSections, eq(schoolClasses.sectionId, schoolSections.id));
    
    const conditions = [];
    if (filters?.classId) conditions.push(eq(exams.classId, filters.classId));
    if (filters?.subjectId) conditions.push(eq(exams.subjectId, filters.subjectId));
    if (filters?.periodName) conditions.push(eq(academicPeriods.name, filters.periodName));

    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      conditions.push(inArray(schoolSections.educationalLevel, compatibleLevels));
    } else if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const teacherSubjects = await db.select({
          classId: classSubjects.classId,
          subjectId: classSubjects.subjectId
        })
        .from(classSubjects)
        .where(eq(classSubjects.employeeId, emp.id));

        if (teacherSubjects.length > 0) {
          const orConditions = teacherSubjects.map(pair => 
            and(eq(exams.classId, pair.classId!), eq(exams.subjectId, pair.subjectId!))
          );
          conditions.push(or(...orConditions));
        } else {
          conditions.push(sql`FALSE`);
        }
      } else {
        conditions.push(sql`FALSE`);
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const data = await query.orderBy(desc(exams.createdAt));
    
    return { data };
  });
}

export async function createExam(formData: ExamFormData) {
  const validation = examSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Exams", "canEdit", async (user) => {
    const { classId, subjectId } = validation.data;
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, classId, subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à créer un examen pour cette classe et cette matière." };
    }

    await db.insert(exams).values({
      ...validation.data,
      examDate: validation.data.examDate ? new Date(validation.data.examDate) : null,
    });
    revalidatePath("/dashboard/academics/exams");
    return { success: true };
  });
}

export async function deleteExam(id: number) {
  return protectedDbAction("Exams", "canDelete", async (user) => {
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, id) });
    if (!exam || !exam.classId || !exam.subjectId) return { error: "Examen non trouvé." };
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, exam.classId, exam.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à supprimer cet examen." };
    }

    await db.delete(exams).where(eq(exams.id, id));
    revalidatePath("/dashboard/academics/exams");
    return { success: true };
  });
}

// --- Results ---
export async function getExamResults(examId: number) {
  return protectedDbAction("Exams", "canView", async (user) => {
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
    if (!exam || !exam.classId || !exam.subjectId) return { error: "Examen non trouvé." };
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, exam.classId, exam.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à voir ces résultats." };
    }

    const data = await db.select({
      id: examResults.id,
      examId: examResults.examId,
      studentId: examResults.studentId,
      marksObtained: examResults.marksObtained,
      remarks: examResults.remarks,
      student: {
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
      }
    })
    .from(examResults)
    .leftJoin(students, eq(examResults.studentId, students.id))
    .where(eq(examResults.examId, examId));
    return { data };
  });
}

export async function saveBatchExamResults(formData: BatchExamResultFormData) {
  const validation = batchExamResultSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Exams", "canEdit", async (user) => {
    const { examId, results } = validation.data;
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
    if (!exam || !exam.classId || !exam.subjectId) return { error: "Examen non trouvé." };
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, exam.classId, exam.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à modifier ces résultats." };
    }

    // Verify Full Academic Session Freeze & Period Lock Status
    if (exam.periodId) {
      const period = await db.query.academicPeriods.findFirst({
        where: eq(academicPeriods.id, exam.periodId)
      });
      if (period) {
        if (period.sessionId) {
          const session = await db.query.schoolSessions.findFirst({
            where: eq(schoolSessions.id, period.sessionId)
          });
          if (session && (!session.isActive || session.status === "Clôturé" || session.status === "Archivé")) {
            return {
              error: `🔒 L'année scolaire (${session.sessionName}) est totalement clôturée et archivée. Aucune modification n'est autorisée (Consultation seule).`
            };
          }
        }

        const isLocked = Boolean(period.isLocked);
        const now = new Date();
        
        // Date checks — startDate compared from beginning of day, endDate to end-of-day
        // so the last day of a period is still open for grade entry.
        const notStartedYet = period.startDate ? now < new Date(period.startDate) : false;
        const endDateEOD = period.endDate ? (() => {
          const d = new Date(period.endDate);
          d.setHours(23, 59, 59, 999);
          return d;
        })() : null;
        const isEnded = endDateEOD ? now > endDateEOD : false;
        const isDeadlineExpired = period.gradesDeadline ? now > new Date(period.gradesDeadline) : false;

        if (isLocked) {
          return { error: "🔒 Cette période d'évaluation est verrouillée manuellement par l'administration. La saisie des notes est congelée." };
        }
        if (notStartedYet) {
          return { error: "⏳ La période d'évaluation n'a pas encore commencé. La saisie des notes s'ouvrira à la date de début prévue." };
        }
        if (isEnded || isDeadlineExpired) {
          return { error: "🔒 La période d'évaluation est expirée ou clôturée (Date de fin dépassée). La saisie et la modification des notes sont congelées." };
        }
      }
    }

    for (const res of results) {
      const existing = await db.query.examResults.findFirst({
        where: and(
          eq(examResults.examId, examId),
          eq(examResults.studentId, res.studentId)
        )
      });

      if (res.originalMarksObtained !== undefined && res.originalMarksObtained !== null && existing) {
        const hasConflict = 
          existing.marksObtained !== res.originalMarksObtained ||
          existing.remarks !== (res.originalRemarks || null);
        if (hasConflict) {
          return {
            error: `Conflict: La note a été modifiée par un autre utilisateur (Note serveur: ${existing.marksObtained}, Saisie: ${res.marksObtained})`,
            conflict: true
          };
        }
      }

      if (existing) {
        await db.update(examResults)
          .set({
            marksObtained: res.marksObtained,
            remarks: res.remarks,
          })
          .where(eq(examResults.id, existing.id));
      } else {
        await db.insert(examResults).values({
          examId,
          studentId: res.studentId,
          marksObtained: res.marksObtained,
          remarks: res.remarks,
        });
      }

      // Check for low grades (< 50% of maxMarks) to trigger automated remediation
      const maxMarks = exam.maxMarks || 20;
      if (res.marksObtained !== null && res.marksObtained !== undefined) {
        const percentage = (res.marksObtained / maxMarks) * 100;
        if (percentage < 50) {
          await triggerAutomatedRemediation(
            user.schoolId,
            res.studentId,
            exam.classId,
            exam.subjectId,
            res.marksObtained,
            maxMarks,
            user.employeeId || null
          );
        }
      }
    }

    revalidatePath("/dashboard/academics/exams");
    return { success: true };
  });
}

/**
 * Automatically creates an active pedagogical remediation record and assigns a targetted
 * LMS homework assignment to help a struggling student catch up.
 */
async function triggerAutomatedRemediation(
  schoolId: number,
  studentId: number,
  classId: number,
  subjectId: number,
  marksObtained: number,
  maxMarks: number,
  employeeId: number | null
) {
  try {
    // 1. Check if an active remediation plan already exists for this student and subject
      const existing = await db.query.pedagogieRemediation.findFirst({
        where: and(
          eq(pedagogieRemediation.schoolId, schoolId),
          eq(pedagogieRemediation.studentId, studentId),
          eq(pedagogieRemediation.subjectId, subjectId),
        eq(pedagogieRemediation.status, "Actif")
      )
    });

    if (existing) {
      // Just update current grade/score
      await db.update(pedagogieRemediation)
        .set({ currentGrade: marksObtained, updatedAt: new Date() })
        .where(and(eq(pedagogieRemediation.id, existing.id), eq(pedagogieRemediation.schoolId, schoolId)));
      return;
    }

    // 2. Create new Active Remediation Plan
    await db.insert(pedagogieRemediation).values({
      schoolId,
      studentId,
      classId,
      subjectId,
      employeeId,
      currentGrade: marksObtained,
      targetGrade: maxMarks * 0.7, // Target is 70% of max marks
      difficulties: `Score faible obtenu lors de l'évaluation (${marksObtained}/${maxMarks}).`,
      remediationPlan: "Planification automatique : Révisions fondamentales guidées et exercices d'application pratiques sur le LMS.",
      status: "Actif",
      alertLevel: "Critique",
      sessionsPlanned: 3,
      sessionsCompleted: 0
    });

    // 3. Create a customized individual LMS homework assignment for this student
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    await db.insert(lmsAssignments).values({
      classId,
      subjectId,
      studentId, // Assigned individually!
      title: "Exercices de Renforcement (Remédiation)",
      description: `Devoir personnalisé suite aux résultats récents. Veuillez effectuer ces exercices pour corriger les lacunes identifiées.`,
      dueDate,
      maxScore: maxMarks,
      status: "Active"
    });

    console.log(`🤖 [Remediation Trigger] Successfully generated plan & LMS assignment for student ID ${studentId}`);
  } catch (error) {
    console.error("❌ Error triggering automated remediation:", error);
  }
}
