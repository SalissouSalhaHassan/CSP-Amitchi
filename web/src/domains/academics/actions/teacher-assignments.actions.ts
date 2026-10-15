"use server";

import { db } from "@/infrastructure/database";
import { teacherClassSubjects, classSubjects } from "@/infrastructure/database/schema/academics";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { protectedDbAction } from "@/lib/protected-action";

export async function initTeacherClassSubjectsTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS teacher_class_subjects (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        class_id INTEGER REFERENCES school_classes(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
        session_id INTEGER REFERENCES school_sessions(id) ON DELETE CASCADE,
        is_principal_teacher BOOLEAN DEFAULT FALSE,
        coefficient INTEGER DEFAULT 1,
        weekly_hours DOUBLE PRECISION DEFAULT 0.0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initTeacherClassSubjectsTable:", e.message);
    return { success: false, error: e.message };
  }
}

export async function getTeacherAssignments() {
  return protectedDbAction("Academics", "canView", async () => {
    await initTeacherClassSubjectsTable();
    const schoolId = await getActiveSchoolId();
    const list = await db.query.teacherClassSubjects.findMany({
      where: eq(teacherClassSubjects.schoolId, schoolId),
      with: {
        employee: true,
        class: true,
        subject: true,
        session: true,
      },
      orderBy: [desc(teacherClassSubjects.createdAt)]
    });
    return { data: list };
  });
}

export async function assignTeacherToClassSubject(data: {
  employeeId: number;
  classId: number;
  subjectId: number;
  sessionId: number;
  isPrincipalTeacher?: boolean;
  coefficient?: number;
  weeklyHours?: number;
}) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await initTeacherClassSubjectsTable();
    const schoolId = await getActiveSchoolId();

    // Check if assignment already exists
    const existing = await db.query.teacherClassSubjects.findFirst({
      where: and(
        eq(teacherClassSubjects.schoolId, schoolId),
        eq(teacherClassSubjects.classId, data.classId),
        eq(teacherClassSubjects.subjectId, data.subjectId),
        eq(teacherClassSubjects.sessionId, data.sessionId)
      )
    });

    if (existing) {
      return { error: "Cet enseignement est déjà affecté." };
    }

    // Insert into teacherClassSubjects
    await db.insert(teacherClassSubjects).values({
      schoolId,
      employeeId: data.employeeId,
      classId: data.classId,
      subjectId: data.subjectId,
      sessionId: data.sessionId,
      isPrincipalTeacher: data.isPrincipalTeacher ?? false,
      coefficient: data.coefficient ?? 1,
      weeklyHours: data.weeklyHours ?? 0.0,
      active: true
    });

    // Mirror to legacy classSubjects table for compatibility
    const existingLegacy = await db.query.classSubjects.findFirst({
      where: and(
        eq(classSubjects.schoolId, schoolId),
        eq(classSubjects.classId, data.classId),
        eq(classSubjects.subjectId, data.subjectId)
      )
    });

    if (existingLegacy) {
      await db.update(classSubjects)
        .set({ employeeId: data.employeeId, coefficient: data.coefficient ?? existingLegacy.coefficient })
        .where(and(eq(classSubjects.id, existingLegacy.id), eq(classSubjects.schoolId, schoolId)));
    } else {
      await db.insert(classSubjects).values({
        schoolId,
        classId: data.classId,
        subjectId: data.subjectId,
        employeeId: data.employeeId,
        coefficient: data.coefficient ?? 1
      });
    }

    revalidatePath("/dashboard/pedagogie");
    revalidatePath("/dashboard/academics");
    return { success: true };
  });
}

export async function removeTeacherAssignment(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await initTeacherClassSubjectsTable();
    const schoolId = await getActiveSchoolId();

    const assignment = await db.query.teacherClassSubjects.findFirst({
      where: and(
        eq(teacherClassSubjects.id, id),
        eq(teacherClassSubjects.schoolId, schoolId)
      )
    });

    if (!assignment) {
      return { error: "Affectation introuvable." };
    }

    // Delete from teacherClassSubjects
    await db.delete(teacherClassSubjects).where(and(eq(teacherClassSubjects.id, id), eq(teacherClassSubjects.schoolId, schoolId)));

    // Update legacy classSubjects (remove teacher binding but preserve class-subject configuration)
    const existingLegacy = await db.query.classSubjects.findFirst({
      where: and(
        eq(classSubjects.schoolId, schoolId),
        eq(classSubjects.classId, assignment.classId!),
        eq(classSubjects.subjectId, assignment.subjectId!)
      )
    });

    if (existingLegacy) {
      await db.update(classSubjects)
        .set({ employeeId: null })
        .where(and(eq(classSubjects.id, existingLegacy.id), eq(classSubjects.schoolId, schoolId)));
    }

    revalidatePath("/dashboard/pedagogie");
    revalidatePath("/dashboard/academics");
    return { success: true };
  });
}

export async function updateTeacherAssignment(id: number, data: {
  employeeId?: number;
  isPrincipalTeacher?: boolean;
  coefficient?: number;
  weeklyHours?: number;
  active?: boolean;
}) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await initTeacherClassSubjectsTable();
    const schoolId = await getActiveSchoolId();

    const assignment = await db.query.teacherClassSubjects.findFirst({
      where: and(
        eq(teacherClassSubjects.id, id),
        eq(teacherClassSubjects.schoolId, schoolId)
      )
    });

    if (!assignment) {
      return { error: "Affectation introuvable." };
    }

    await db.update(teacherClassSubjects)
      .set(data as any)
      .where(and(eq(teacherClassSubjects.id, id), eq(teacherClassSubjects.schoolId, schoolId)));

    // Mirror to legacy classSubjects if employeeId or coefficient changes
    if (data.employeeId !== undefined || data.coefficient !== undefined) {
      const existingLegacy = await db.query.classSubjects.findFirst({
        where: and(
          eq(classSubjects.schoolId, schoolId),
          eq(classSubjects.classId, assignment.classId!),
          eq(classSubjects.subjectId, assignment.subjectId!)
        )
      });

      if (existingLegacy) {
        await db.update(classSubjects)
          .set({
            employeeId: data.employeeId !== undefined ? data.employeeId : existingLegacy.employeeId,
            coefficient: data.coefficient !== undefined ? data.coefficient : existingLegacy.coefficient
          })
          .where(and(eq(classSubjects.id, existingLegacy.id), eq(classSubjects.schoolId, schoolId)));
      }
    }

    revalidatePath("/dashboard/pedagogie");
    revalidatePath("/dashboard/academics");
    return { success: true };
  });
}
