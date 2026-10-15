"use server";

import { db } from "@/infrastructure/database";
import { homework } from "@/infrastructure/database/schema/homework";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, inArray, and, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { homeworkSchema, HomeworkFormData } from "../validators/homework.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getTeacherEmployee, getTeacherClassIds, verifyTeacherClassAccess, verifyTeacherClassSubjectAccess, checkEducationalLevelAccess, hasAllEducationalLevels } from "@/domains/auth/services/rbac";
import { classSubjects, schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export async function getHomeworks() {
  return protectedDbAction("Academics", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const roleType = await getUserRoleType(user);

    // 1. ELEVE (Student) — Only homework assigned to their own class
    if (roleType === "eleve") {
      const studentId = user.studentId || (user as any).student_id;
      let studentRecord: any = null;
      if (studentId) {
        studentRecord = await db.query.students.findFirst({ where: eq(students.id, Number(studentId)) });
      }
      if (!studentRecord && (user as any).utilisateur) {
        studentRecord = await db.query.students.findFirst({ where: eq(students.numAdmission, String((user as any).utilisateur)) });
      }
      if (!studentRecord || !studentRecord.classe) return { data: [] };

      const classRow = await db.query.schoolClasses.findFirst({
        where: and(
          eq(schoolClasses.schoolId, schoolId),
          eq(schoolClasses.className, studentRecord.classe)
        )
      });
      if (!classRow) return { data: [] };

      const data = await db.query.homework.findMany({
        where: eq(homework.classId, classRow.id),
        with: { class: true, subject: true },
        orderBy: [desc(homework.dateAssigned)],
      });

      return { data };
    }

    // 2. PARENT — Only homework assigned to their child's class
    if (roleType === "parent") {
      const childId = user.studentId;
      if (!childId) return { data: [] };
      const studentRecord = await db.query.students.findFirst({ where: eq(students.id, Number(childId)) });
      if (!studentRecord || !studentRecord.classe) return { data: [] };

      const classRow = await db.query.schoolClasses.findFirst({
        where: and(
          eq(schoolClasses.schoolId, schoolId),
          eq(schoolClasses.className, studentRecord.classe)
        )
      });
      if (!classRow) return { data: [] };

      const data = await db.query.homework.findMany({
        where: eq(homework.classId, classRow.id),
        with: { class: true, subject: true },
        orderBy: [desc(homework.dateAssigned)],
      });

      return { data };
    }

    // 3. TEACHER — Only homework for assigned classes/subjects
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp) return { data: [] };

      const teacherSubjects = await db.select({
        classId: classSubjects.classId,
        subjectId: classSubjects.subjectId
      })
      .from(classSubjects)
      .where(eq(classSubjects.employeeId, emp.id));

      if (teacherSubjects.length === 0) return { data: [] };

      const orConditions = teacherSubjects.map(pair => 
        and(eq(homework.classId, pair.classId!), eq(homework.subjectId, pair.subjectId!))
      );

      const data = await db.query.homework.findMany({
        where: or(...orConditions),
        with: { class: true, subject: true },
        orderBy: [desc(homework.dateAssigned)],
      });

      const filtered = data.filter((h) => h.class?.schoolId === schoolId);
      return { data: filtered };
    }

    // 4. Admin/Director sees homework for their school (scoped by level for level directors)
    const data = await db.query.homework.findMany({
      with: { class: { with: { section: true } }, subject: true },
      orderBy: [desc(homework.dateAssigned)],
    });

    let filtered = data.filter((h) => h.class?.schoolId === schoolId);
    const isRestrictedLevel = roleType === "level_director" || (user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel));
    if (isRestrictedLevel) {
      filtered = filtered.filter((h) => checkEducationalLevelAccess(user, (h.class as any)?.section?.educationalLevel));
    }
    return { data: filtered };
  });
}

export async function createHomework(formData: HomeworkFormData) {
  const validation = homeworkSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Academics", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "eleve" || roleType === "parent") {
      return { error: "Accès refusé. Création de devoirs interdite aux élèves et parents." };
    }
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    // Verify teacher has access to this class and subject
    if (validation.data.classId && validation.data.subjectId) {
      const hasAccess = await verifyTeacherClassSubjectAccess(
        user, 
        validation.data.classId, 
        validation.data.subjectId
      );
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
      }
    }

    // Verify target class and subject belong to the school
    if (validation.data.classId && validation.data.subjectId) {
      const targetClass = await db.query.schoolClasses.findFirst({
        where: and(
          eq(schoolClasses.id, validation.data.classId),
          eq(schoolClasses.schoolId, schoolId)
        ),
        with: { section: true }
      });
      if (!targetClass) {
        return { error: "Classe introuvable ou non autorisée." };
      }

      if (roleType === "level_director" || (user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel))) {
        if (!checkEducationalLevelAccess(user, targetClass.section?.educationalLevel)) {
          return { error: "Accès refusé. Cette classe n'appartient pas à votre cycle d'enseignement." };
        }
      }

      const targetSubject = await db.query.schoolSubjects.findFirst({
        where: and(
          eq(schoolSubjects.id, validation.data.subjectId),
          eq(schoolSubjects.schoolId, schoolId)
        )
      });
      if (!targetSubject) {
        return { error: "Matière introuvable ou non autorisée." };
      }
    }

    await db.insert(homework).values({
      ...validation.data,
      dateDue: new Date(validation.data.dateDue),
    });

    // Trigger Real-time Mobile Push Notification for Homework
    try {
      const { PushNotificationService } = await import("@/shared/services/push-notification.service");
      
      let className = "";
      let subjectName = "";

      if (validation.data.classId) {
        const cls = await db.query.schoolClasses.findFirst({ where: eq(schoolClasses.id, validation.data.classId) });
        if (cls) className = cls.className;
      }

      if (validation.data.subjectId) {
        const sub = await db.query.schoolSubjects.findFirst({ where: eq(schoolSubjects.id, validation.data.subjectId) });
        if (sub) subjectName = sub.subjectName;
      }

      const dateDueFormatted = new Date(validation.data.dateDue).toLocaleDateString("fr-FR");

      await PushNotificationService.sendHomeworkAlert({
        homeworkTitle: validation.data.title,
        classId: validation.data.classId,
        className,
        subjectName,
        dateDue: dateDueFormatted,
      });
    } catch (pushErr) {
      console.error("[Push Notification] Failed to dispatch homework push alert:", pushErr);
    }

    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}

export async function updateHomework(id: number, formData: HomeworkFormData) {
  const validation = homeworkSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Academics", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "eleve" || roleType === "parent") {
      return { error: "Accès refusé. Modification interdite aux élèves et parents." };
    }
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    // Verify existing homework belongs to the active school
    const existing = await db.query.homework.findFirst({
      where: eq(homework.id, id),
      with: { class: true }
    });
    if (!existing || existing.class?.schoolId !== schoolId) {
      return { error: "Devoir introuvable ou non autorisé." };
    }

    // Verify teacher has access to the target class and subject
    if (validation.data.classId && validation.data.subjectId) {
      const hasAccess = await verifyTeacherClassSubjectAccess(
        user, 
        validation.data.classId, 
        validation.data.subjectId
      );
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
      }
    }

    // Verify target class and subject belong to the school
    if (validation.data.classId && validation.data.subjectId) {
      const targetClass = await db.query.schoolClasses.findFirst({
        where: and(
          eq(schoolClasses.id, validation.data.classId),
          eq(schoolClasses.schoolId, schoolId)
        ),
        with: { section: true }
      });
      if (!targetClass) {
        return { error: "Classe cible introuvable ou non autorisée." };
      }

      if (roleType === "level_director" || (user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel))) {
        if (!checkEducationalLevelAccess(user, targetClass.section?.educationalLevel)) {
          return { error: "Accès refusé. Cette classe n'appartient pas à votre cycle d'enseignement." };
        }
      }

      const targetSubject = await db.query.schoolSubjects.findFirst({
        where: and(
          eq(schoolSubjects.id, validation.data.subjectId),
          eq(schoolSubjects.schoolId, schoolId)
        )
      });
      if (!targetSubject) {
        return { error: "Matière cible introuvable ou non autorisée." };
      }
    }

    await db.update(homework)
      .set({
        ...validation.data,
        dateDue: new Date(validation.data.dateDue),
      })
      .where(eq(homework.id, id));
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}

export async function deleteHomework(id: number) {
  return protectedDbAction("Academics", "canDelete", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "eleve" || roleType === "parent") {
      return { error: "Accès refusé. Suppression interdite aux élèves et parents." };
    }
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    // Verify existing homework belongs to the active school
    const existing = await db.query.homework.findFirst({
      where: eq(homework.id, id),
      with: { class: { with: { section: true } } }
    });
    if (!existing || existing.class?.schoolId !== schoolId) {
      return { error: "Devoir introuvable ou non autorisé." };
    }

    if (roleType === "level_director" || (user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel))) {
      if (!checkEducationalLevelAccess(user, (existing.class as any)?.section?.educationalLevel)) {
        return { error: "Accès refusé. Ce devoir n'appartient pas à votre cycle d'enseignement." };
      }
    }

    // Verify teacher owns the homework's class and subject before deleting
    if (existing.classId && existing.subjectId) {
      const hasAccess = await verifyTeacherClassSubjectAccess(user, existing.classId, existing.subjectId);
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
      }
    }

    await db.delete(homework).where(eq(homework.id, id));
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}

// ─── Student Personal Homework Action (Secure Isolation) ──────────────────────

export async function getStudentPersonalHomeworkAction() {
  return protectedDbAction("Academics", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { success: false, error: "Aucune école active." };

    // Resolve student record
    let studentRecord: any = null;
    const rawStudentId = (user as any).studentId || (user as any).student_id;
    if (rawStudentId) {
      studentRecord = await db.query.students.findFirst({
        where: eq(students.id, Number(rawStudentId)),
      });
    }

    const usernameStr = typeof (user as any).utilisateur === "string"
      ? ((user as any).utilisateur as string)
      : typeof (user as any).username === "string"
        ? ((user as any).username as string)
        : "";

    if (!studentRecord && usernameStr.trim().length > 0) {
      studentRecord = await db.query.students.findFirst({
        where: and(
          eq(students.schoolId, schoolId),
          eq(students.numAdmission, usernameStr.trim())
        ),
      });
    }

    if (!studentRecord || !studentRecord.classe) {
      return { success: false, error: "Profil étudiant ou classe introuvable pour ce compte." };
    }

    // Resolve student class with case-insensitive and space-insensitive matching
    const studentClassName = studentRecord.classe.trim();
    let classRow = await db.query.schoolClasses.findFirst({
      where: and(
        schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
        or(
          eq(schoolClasses.className, studentClassName),
          sql`LOWER(TRIM(${schoolClasses.className})) = LOWER(TRIM(${studentClassName}))`,
          sql`REPLACE(LOWER(${schoolClasses.className}), ' ', '') = REPLACE(LOWER(${studentClassName}), ' ', '')`
        )
      ),
      with: { section: true },
    });

    if (!classRow) {
      classRow = await db.query.schoolClasses.findFirst({
        where: or(
          eq(schoolClasses.className, studentClassName),
          sql`LOWER(TRIM(${schoolClasses.className})) = LOWER(TRIM(${studentClassName}))`,
          sql`REPLACE(LOWER(${schoolClasses.className}), ' ', '') = REPLACE(LOWER(${studentClassName}), ' ', '')`
        ),
        with: { section: true },
      });
    }

    if (!classRow) {
      return { success: false, error: "Classe introuvable pour cet élève." };
    }

    // Fetch homework assigned to this student's class
    const homeworks = await db.query.homework.findMany({
      where: eq(homework.classId, classRow.id),
      with: {
        subject: true,
      },
      orderBy: [desc(homework.dateDue)],
    });

    const now = new Date();

    const formatted = homeworks.map((h) => {
      const dueDate = h.dateDue ? new Date(h.dateDue) : null;
      const isPastDue = dueDate ? dueDate < now : false;

      return {
        id: h.id,
        title: h.title,
        description: h.description,
        dateAssigned: h.dateAssigned ? h.dateAssigned.toISOString() : null,
        dateDue: h.dateDue ? h.dateDue.toISOString() : null,
        documentPath: h.attachmentPath || null,
        evaluationMarks: (h as any).evaluationMarks || null,
        subjectId: h.subjectId,
        subjectName: h.subject?.subjectName || "Matière",
        subjectCode: h.subject?.subjectCode || "",
        isPastDue,
      };
    });

    const pending = formatted.filter((h) => !h.isPastDue);
    const past = formatted.filter((h) => h.isPastDue);

    return {
      success: true,
      data: {
        student: {
          id: studentRecord.id,
          nomEtudiant: studentRecord.nomEtudiant,
          numAdmission: studentRecord.numAdmission,
          classe: studentRecord.classe,
        },
        class: {
          id: classRow.id,
          name: classRow.className,
          level: classRow.section?.educationalLevel || studentRecord.educationalLevel || "Lycée",
        },
        stats: {
          total: formatted.length,
          pendingCount: pending.length,
          pastCount: past.length,
        },
        homeworks: formatted,
      },
    };
  });
}
