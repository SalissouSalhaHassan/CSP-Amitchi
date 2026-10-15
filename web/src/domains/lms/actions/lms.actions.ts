"use server";

import { db } from "@/infrastructure/database";
import { 
  lmsCourses, lmsModules, lmsLessons, lmsResources, 
  lmsEnrollments, lmsProgress, lmsVirtualClasses, 
  lmsVirtualAttendance, lmsAssignments, lmsSubmissions, 
  lmsQuizzes, lmsQuestions, lmsAnswers, lmsDiscussions, 
  lmsCertificates 
} from "@/infrastructure/database/schema/lms";
import { eq, desc, and, sql, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { getUserRoleType, getTeacherEmployee, getTeacherClassIds } from "@/domains/auth/services/rbac";
import { getActiveSchoolId } from "@/domains/auth/services/school";

async function getActiveSchoolClassIds() {
  const schoolId = await getActiveSchoolId();
  if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");
  const classes = await db.query.schoolClasses.findMany({
    where: eq(schoolClasses.schoolId, schoolId),
    columns: { id: true },
  });
  return classes.map((classe) => classe.id);
}

async function assertClassInActiveSchool(classId: number | null | undefined) {
  if (!classId) throw new Error("Classe invalide.");
  const schoolId = await getActiveSchoolId();
  if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");
  const classe = await db.query.schoolClasses.findFirst({
    where: and(eq(schoolClasses.id, classId), eq(schoolClasses.schoolId, schoolId)),
  });
  if (!classe) throw new Error("Accès refusé pour cette école.");
}

async function assertCourseInActiveSchool(courseId: number | null | undefined) {
  if (!courseId) throw new Error("Cours invalide.");
  const course = await db.query.lmsCourses.findFirst({ where: eq(lmsCourses.id, courseId) });
  if (!course) throw new Error("Cours introuvable.");
  await assertClassInActiveSchool(course.classId);
  return course;
}

async function assertModuleInActiveSchool(moduleId: number) {
  const module = await db.query.lmsModules.findFirst({ where: eq(lmsModules.id, moduleId) });
  if (!module) throw new Error("Module introuvable.");
  await assertCourseInActiveSchool(module.courseId);
  return module;
}

async function assertLessonInActiveSchool(lessonId: number) {
  const lesson = await db.query.lmsLessons.findFirst({ where: eq(lmsLessons.id, lessonId) });
  if (!lesson) throw new Error("Leçon introuvable.");
  if (lesson.courseId) await assertCourseInActiveSchool(lesson.courseId);
  else await assertClassInActiveSchool(lesson.classId);
  return lesson;
}

async function assertAssignmentInActiveSchool(assignmentId: number) {
  const assignment = await db.query.lmsAssignments.findFirst({ where: eq(lmsAssignments.id, assignmentId) });
  if (!assignment) throw new Error("Devoir introuvable.");
  if (assignment.courseId) await assertCourseInActiveSchool(assignment.courseId);
  else await assertClassInActiveSchool(assignment.classId);
  return assignment;
}

async function assertSubmissionInActiveSchool(submissionId: number) {
  const submission = await db.query.lmsSubmissions.findFirst({ where: eq(lmsSubmissions.id, submissionId) });
  if (!submission) throw new Error("Soumission introuvable.");
  await assertAssignmentInActiveSchool(submission.assignmentId!);
  return submission;
}

async function assertVirtualClassInActiveSchool(virtualClassId: number) {
  const virtualClass = await db.query.lmsVirtualClasses.findFirst({ where: eq(lmsVirtualClasses.id, virtualClassId) });
  if (!virtualClass) throw new Error("Classe virtuelle introuvable.");
  await assertClassInActiveSchool(virtualClass.classId);
  return virtualClass;
}

async function assertQuizInActiveSchool(quizId: number) {
  const quiz = await db.query.lmsQuizzes.findFirst({ where: eq(lmsQuizzes.id, quizId) });
  if (!quiz) throw new Error("Quiz introuvable.");
  await assertCourseInActiveSchool(quiz.courseId);
  return quiz;
}

export async function initLmsDatabaseTables() {
  return protectedDbAction("LMS", "canView", async () => {
    // 1. Create tables if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_courses (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        class_id INTEGER,
        subject_id INTEGER,
        teacher_id INTEGER,
        status VARCHAR(20) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_lessons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        module VARCHAR(255),
        module_id INTEGER,
        course_id INTEGER,
        class_id INTEGER,
        subject_id INTEGER,
        content TEXT,
        file_path TEXT,
        video_url TEXT,
        content_type VARCHAR(50) DEFAULT 'Text',
        duration INTEGER DEFAULT 15,
        display_order INTEGER DEFAULT 0,
        recorded_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Alter table for lms_lessons columns if they exist/don't exist
    const alterLessons = [
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS module_id INTEGER",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS course_id INTEGER",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS class_id INTEGER",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS subject_id INTEGER",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'Text'",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 15",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS video_url TEXT",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS file_path TEXT",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS content TEXT",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(100)",
      "ALTER TABLE lms_lessons DROP CONSTRAINT IF EXISTS lms_lessons_class_id_school_classes_id_fk",
      "ALTER TABLE lms_lessons DROP CONSTRAINT IF EXISTS lms_lessons_subject_id_school_subjects_id_fk"
    ];
    for (const q of alterLessons) {
      try { await db.execute(sql.raw(q)); } catch(e){}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_resources (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER,
        title VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        file_path TEXT,
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_enrollments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        student_id INTEGER,
        status VARCHAR(20) DEFAULT 'Active',
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER,
        lesson_id INTEGER,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        last_position INTEGER DEFAULT 0,
        personal_notes TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_virtual_classes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        class_id INTEGER,
        subject_id INTEGER,
        teacher_id INTEGER,
        session_date TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 45,
        meeting_url TEXT NOT NULL,
        meeting_password VARCHAR(50),
        status VARCHAR(20) DEFAULT 'À venir',
        platform VARCHAR(50) DEFAULT 'Google Meet',
        recording_url TEXT,
        recorded_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const alterVirtual = [
      "ALTER TABLE lms_virtual_classes ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'Google Meet'",
      "ALTER TABLE lms_virtual_classes ADD COLUMN IF NOT EXISTS recording_url TEXT",
      "ALTER TABLE lms_virtual_classes ADD COLUMN IF NOT EXISTS teacher_id INTEGER",
      "ALTER TABLE lms_virtual_classes DROP CONSTRAINT IF EXISTS lms_virtual_classes_class_id_school_classes_id_fk",
      "ALTER TABLE lms_virtual_classes DROP CONSTRAINT IF EXISTS lms_virtual_classes_subject_id_school_subjects_id_fk"
    ];
    for (const q of alterVirtual) {
      try { await db.execute(sql.raw(q)); } catch(e){}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_virtual_attendance (
        id SERIAL PRIMARY KEY,
        virtual_class_id INTEGER,
        student_id INTEGER,
        status VARCHAR(20) DEFAULT 'Present',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INTEGER DEFAULT 0
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_assignments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        class_id INTEGER,
        subject_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_sujet_path TEXT,
        due_date TIMESTAMP NOT NULL,
        max_score DOUBLE PRECISION DEFAULT 20.0,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER,
        student_id INTEGER,
        file_reponse_path TEXT,
        score DOUBLE PRECISION,
        comment TEXT,
        is_graded BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_quizzes (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_min INTEGER DEFAULT 20,
        max_attempts INTEGER DEFAULT 1,
        passing_score DOUBLE PRECISION DEFAULT 10.0,
        status VARCHAR(20) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'QCM',
        points DOUBLE PRECISION DEFAULT 2.0,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER,
        answer_text TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        explanation TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_discussions (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        lesson_id INTEGER,
        student_id INTEGER,
        employee_id INTEGER,
        message TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_certificates (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        student_id INTEGER,
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        certificate_code VARCHAR(100) NOT NULL
      );
    `);

    return { success: true };
  });
}

// --- Courses ---
export async function getCourses() {
  return protectedDbAction("LMS", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    const schoolClassIds = await getActiveSchoolClassIds();
    
    let whereClause: any = schoolClassIds.length > 0 ? inArray(lmsCourses.classId, schoolClassIds) : sql`FALSE`;
    
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        whereClause = and(whereClause, eq(lmsCourses.teacherId, emp.id));
      } else {
        whereClause = sql`FALSE`;
      }
    } else if (
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur")
    ) {
      if (user.studentId) {
        const std = await db.query.students.findFirst({
          where: eq(students.id, Number(user.studentId))
        });
        if (std?.classe) {
          const cls = await db.query.schoolClasses.findFirst({
            where: and(eq(schoolClasses.className, std.classe), eq(schoolClasses.schoolId, user.schoolId))
          });
          if (cls) {
            whereClause = eq(lmsCourses.classId, cls.id);
          } else {
            whereClause = sql`FALSE`;
          }
        } else {
          whereClause = sql`FALSE`;
        }
      } else {
        whereClause = sql`FALSE`;
      }
    }

    const data = await db.query.lmsCourses.findMany({
      where: whereClause,
      with: {
        class: true,
        subject: true,
        teacher: true,
        modules: {
          with: {
            lessons: true
          }
        },
        enrollments: true
      },
      orderBy: [desc(lmsCourses.createdAt)]
    });
    return { data };
  });
}

export async function saveCourse(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await assertClassInActiveSchool(data.classId);
    if (id) {
      await assertCourseInActiveSchool(id);
      await db.update(lmsCourses).set(data).where(eq(lmsCourses.id, id));
    } else {
      await db.insert(lmsCourses).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteCourse(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await assertCourseInActiveSchool(id);
    await db.delete(lmsCourses).where(eq(lmsCourses.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Modules & Lessons ---
export async function getModules(courseId: number) {
  return protectedDbAction("LMS", "canView", async () => {
    await assertCourseInActiveSchool(courseId);
    const data = await db.query.lmsModules.findMany({
      where: eq(lmsModules.courseId, courseId),
      with: {
        lessons: true
      },
      orderBy: [asc(lmsModules.displayOrder)]
    });
    return { data };
  });
}

export async function saveModule(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await assertCourseInActiveSchool(data.courseId);
    if (id) {
      await assertModuleInActiveSchool(id);
      await db.update(lmsModules).set(data).where(eq(lmsModules.id, id));
    } else {
      await db.insert(lmsModules).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteModule(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await assertModuleInActiveSchool(id);
    await db.delete(lmsModules).where(eq(lmsModules.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function getLmsLessons() {
  return protectedDbAction("LMS", "canView", async () => {
    const schoolClassIds = await getActiveSchoolClassIds();
    const data = await db.query.lmsLessons.findMany({
      where: schoolClassIds.length > 0 ? inArray(lmsLessons.classId, schoolClassIds) : sql`FALSE`,
      with: {
        class: true,
        subject: true,
        course: true,
        module: true
      },
      orderBy: [desc(lmsLessons.createdAt)]
    });
    return { data };
  });
}

export async function saveLmsLesson(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (data.courseId) await assertCourseInActiveSchool(data.courseId);
    else await assertClassInActiveSchool(data.classId);
    if (id) {
      await assertLessonInActiveSchool(id);
      await db.update(lmsLessons).set(data).where(eq(lmsLessons.id, id));
    } else {
      await db.insert(lmsLessons).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteLmsLesson(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await assertLessonInActiveSchool(id);
    await db.delete(lmsLessons).where(eq(lmsLessons.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Enrollments & Progress ---
export async function enrollStudent(courseId: number, studentId: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await assertCourseInActiveSchool(courseId);
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Accès refusé pour cette école." };

    const existing = await db.query.lmsEnrollments.findFirst({
      where: and(
        eq(lmsEnrollments.courseId, courseId),
        eq(lmsEnrollments.studentId, studentId)
      )
    });
    if (!existing) {
      await db.insert(lmsEnrollments).values({ courseId, studentId });
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function getStudentProgress(studentId: number, courseId: number) {
  return protectedDbAction("LMS", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { progress: 0, completedLessons: [] };
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { progress: 0, completedLessons: [] };
    await assertCourseInActiveSchool(courseId);

    const course = await db.query.lmsCourses.findFirst({
      where: eq(lmsCourses.id, courseId),
      with: {
        lessons: true
      }
    });
    if (!course) return { progress: 0, completedLessons: [] };
    
    const progressList = await db.query.lmsProgress.findMany({
      where: eq(lmsProgress.studentId, studentId)
    });

    const completedLessonIds = progressList
      .filter(p => p.isCompleted)
      .map(p => p.lessonId);

    const totalLessons = course.lessons.length;
    const completedCount = course.lessons.filter(l => completedLessonIds.includes(l.id)).length;
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return { progress, completedLessons: completedLessonIds, progressRecords: progressList };
  });
}

export async function updateLessonProgress(data: { studentId: number; lessonId: number; isCompleted: boolean; personalNotes?: string; lastPosition?: number }) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Accès refusé pour cette école." };
    await assertLessonInActiveSchool(data.lessonId);

    const existing = await db.query.lmsProgress.findFirst({
      where: and(
        eq(lmsProgress.studentId, data.studentId),
        eq(lmsProgress.lessonId, data.lessonId)
      )
    });
    if (existing) {
      await db.update(lmsProgress).set({
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
        personalNotes: data.personalNotes ?? existing.personalNotes,
        lastPosition: data.lastPosition ?? existing.lastPosition
      }).where(eq(lmsProgress.id, existing.id));
    } else {
      await db.insert(lmsProgress).values({
        studentId: data.studentId,
        lessonId: data.lessonId,
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
        personalNotes: data.personalNotes ?? "",
        lastPosition: data.lastPosition ?? 0
      });
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Virtual Classes ---
export async function getLmsVirtualClasses() {
  return protectedDbAction("LMS", "canView", async () => {
    const schoolClassIds = await getActiveSchoolClassIds();
    const data = await db.query.lmsVirtualClasses.findMany({
      where: schoolClassIds.length > 0 ? inArray(lmsVirtualClasses.classId, schoolClassIds) : sql`FALSE`,
      with: {
        class: true,
        subject: true,
        teacher: true,
        attendance: true
      },
      orderBy: [desc(lmsVirtualClasses.sessionDate)]
    });
    return { data };
  });
}

export async function saveVirtualClass(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await assertClassInActiveSchool(data.classId);
    if (id) {
      await assertVirtualClassInActiveSchool(id);
      await db.update(lmsVirtualClasses).set(data).where(eq(lmsVirtualClasses.id, id));
    } else {
      await db.insert(lmsVirtualClasses).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteVirtualClass(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await assertVirtualClassInActiveSchool(id);
    await db.delete(lmsVirtualClasses).where(eq(lmsVirtualClasses.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Assignments & Submissions ---
export async function getAssignments() {
  return protectedDbAction("LMS", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    const schoolClassIds = await getActiveSchoolClassIds();
    
    let whereClause: any = schoolClassIds.length > 0 ? inArray(lmsAssignments.classId, schoolClassIds) : sql`FALSE`;
    
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const classIds = await getTeacherClassIds(emp.id);
        if (classIds.length > 0) {
          whereClause = and(whereClause, inArray(lmsAssignments.classId, classIds));
        } else {
          whereClause = sql`FALSE`;
        }
      } else {
        whereClause = sql`FALSE`;
      }
    } else if (
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur")
    ) {
      if (user.studentId) {
        const std = await db.query.students.findFirst({
          where: eq(students.id, Number(user.studentId))
        });
        if (std?.classe) {
          const cls = await db.query.schoolClasses.findFirst({
            where: and(eq(schoolClasses.className, std.classe), eq(schoolClasses.schoolId, user.schoolId))
          });
          if (cls) {
            whereClause = eq(lmsAssignments.classId, cls.id);
          } else {
            whereClause = sql`FALSE`;
          }
        } else {
          whereClause = sql`FALSE`;
        }
      } else {
        whereClause = sql`FALSE`;
      }
    }

    const data = await db.query.lmsAssignments.findMany({
      where: whereClause,
      with: {
        course: true,
        class: true,
        subject: true,
        submissions: {
          with: {
            student: true
          }
        }
      },
      orderBy: [desc(lmsAssignments.dueDate)]
    });
    return { data };
  });
}

export async function saveAssignment(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (data.courseId) await assertCourseInActiveSchool(data.courseId);
    else await assertClassInActiveSchool(data.classId);
    if (id) {
      await assertAssignmentInActiveSchool(id);
      await db.update(lmsAssignments).set(data).where(eq(lmsAssignments.id, id));
    } else {
      await db.insert(lmsAssignments).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteAssignment(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await assertAssignmentInActiveSchool(id);
    await db.delete(lmsAssignments).where(eq(lmsAssignments.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function saveSubmission(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await assertAssignmentInActiveSchool(data.assignmentId);
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)),
    });
    if (!student) return { error: "Accès refusé pour cette école." };
    if (id) {
      await assertSubmissionInActiveSchool(id);
      await db.update(lmsSubmissions).set(data).where(eq(lmsSubmissions.id, id));
    } else {
      await db.insert(lmsSubmissions).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function gradeSubmission(submissionId: number, score: number, comment: string) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await assertSubmissionInActiveSchool(submissionId);
    await db.update(lmsSubmissions).set({
      score,
      comment,
      isGraded: true
    }).where(eq(lmsSubmissions.id, submissionId));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Quizzes ---
export async function getQuizzes() {
  return protectedDbAction("LMS", "canView", async () => {
    const schoolClassIds = await getActiveSchoolClassIds();
    const courses = await db.query.lmsCourses.findMany({
      where: schoolClassIds.length > 0 ? inArray(lmsCourses.classId, schoolClassIds) : sql`FALSE`,
      columns: { id: true },
    });
    const courseIds = courses.map((course) => course.id);
    const data = await db.query.lmsQuizzes.findMany({
      where: courseIds.length > 0 ? inArray(lmsQuizzes.courseId, courseIds) : sql`FALSE`,
      with: {
        course: true,
        questions: {
          with: {
            answers: true
          }
        }
      },
      orderBy: [desc(lmsQuizzes.createdAt)]
    });
    return { data };
  });
}

export async function saveQuiz(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const { questions, ...quizData } = data;
    let quizId = id;
    await assertCourseInActiveSchool(quizData.courseId);
    if (id) {
      await assertQuizInActiveSchool(id);
      await db.update(lmsQuizzes).set(quizData).where(eq(lmsQuizzes.id, id));
    } else {
      const inserted = await db.insert(lmsQuizzes).values(quizData).returning({ id: lmsQuizzes.id });
      quizId = inserted[0].id;
    }

    if (questions && quizId) {
      await assertQuizInActiveSchool(quizId);
      // Simple sync: delete old questions and insert new ones
      await db.delete(lmsQuestions).where(eq(lmsQuestions.quizId, quizId));
      for (const q of questions) {
        const qInserted = await db.insert(lmsQuestions).values({
          quizId,
          questionText: q.questionText,
          questionType: q.questionType,
          points: q.points,
          displayOrder: q.displayOrder
        }).returning({ id: lmsQuestions.id });

        const qId = qInserted[0].id;
        if (q.answers && qId) {
          for (const ans of q.answers) {
            await db.insert(lmsAnswers).values({
              questionId: qId,
              answerText: ans.answerText,
              isCorrect: ans.isCorrect,
              explanation: ans.explanation
            });
          }
        }
      }
    }

    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteQuiz(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await assertQuizInActiveSchool(id);
    await db.delete(lmsQuizzes).where(eq(lmsQuizzes.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Discussions ---
export async function getDiscussions(courseId: number, lessonId?: number) {
  return protectedDbAction("LMS", "canView", async () => {
    await assertCourseInActiveSchool(courseId);
    if (lessonId) await assertLessonInActiveSchool(lessonId);
    const conds = [eq(lmsDiscussions.courseId, courseId)];
    if (lessonId) conds.push(eq(lmsDiscussions.lessonId, lessonId));
    
    const data = await db.query.lmsDiscussions.findMany({
      where: and(...conds),
      with: {
        student: true,
        employee: true
      },
      orderBy: [asc(lmsDiscussions.createdAt)]
    });
    return { data };
  });
}

export async function postMessage(data: any) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await assertCourseInActiveSchool(data.courseId);
    if (data.lessonId) await assertLessonInActiveSchool(data.lessonId);
    await db.insert(lmsDiscussions).values(data);
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- LMS Reports ---
export async function getLmsReportsData() {
  return protectedDbAction("LMS", "canView", async () => {
    const schoolClassIds = await getActiveSchoolClassIds();
    const courses = await db.query.lmsCourses.findMany({
      where: schoolClassIds.length > 0 ? inArray(lmsCourses.classId, schoolClassIds) : sql`FALSE`,
      with: {
        class: true,
        subject: true,
        teacher: true,
        lessons: true,
        enrollments: {
          with: {
            student: true
          }
        }
      }
    });

    const progress = await db.query.lmsProgress.findMany();
    const virtualClasses = await db.query.lmsVirtualClasses.findMany({
      where: schoolClassIds.length > 0 ? inArray(lmsVirtualClasses.classId, schoolClassIds) : sql`FALSE`,
      with: {
        class: true,
        subject: true,
        attendance: true
      }
    });

    const assignments = await db.query.lmsAssignments.findMany({
      where: schoolClassIds.length > 0 ? inArray(lmsAssignments.classId, schoolClassIds) : sql`FALSE`,
      with: {
        class: true,
        subject: true,
        submissions: true
      }
    });

    return { courses, progress, virtualClasses, assignments };
  });
}

// ─── Sample Data Seeding ──────────────────────────────────────────────────────

export async function seedSampleLmsData() {
  return protectedDbAction("LMS", "canEdit", async (user) => {
    await initLmsDatabaseTables();
    const schoolId = await getActiveSchoolId();
    if (!schoolId) throw new Error("Aucun contexte d'école actif trouvé.");

    // 1. Get or create classes
    let classes = await db.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId),
    });

    if (classes.length === 0) {
      const insertedClasses = await db.insert(schoolClasses).values([
        { schoolId, className: "6ème A" },
        { schoolId, className: "5ème A" },
        { schoolId, className: "4ème A" },
        { schoolId, className: "3ème A" },
        { schoolId, className: "Seconde S" },
        { schoolId, className: "Terminale D" },
      ]).returning();
      classes = insertedClasses;
    }

    // 2. Get or create subjects
    let subjects = await db.query.schoolSubjects.findMany({
      where: eq(schoolSubjects.schoolId, schoolId),
    });

    if (subjects.length === 0) {
      const insertedSubjects = await db.insert(schoolSubjects).values([
        { schoolId, subjectName: "Mathématiques", subjectCode: "MATH" },
        { schoolId, subjectName: "Sciences Physiques & Chimie", subjectCode: "PHYS" },
        { schoolId, subjectName: "Français & Littérature", subjectCode: "FRAN" },
        { schoolId, subjectName: "Informatique & Coding", subjectCode: "INFO" },
        { schoolId, subjectName: "Histoire & Géographie", subjectCode: "HIST" },
        { schoolId, subjectName: "Anglais LV1", subjectCode: "ANGL" },
      ]).returning();
      subjects = insertedSubjects;
    }

    // 3. Teachers
    const teachers = await db.query.employees.findMany({
      where: eq(employees.schoolId, schoolId),
    });
    const defaultTeacherId = teachers.length > 0 ? teachers[0].id : null;

    // 4. Students
    const schoolStudents = await db.query.students.findMany({
      where: eq(students.schoolId, schoolId),
      limit: 15,
    });

    // 5. Courses definitions
    const sampleCoursesDefs: any[] = [
      {
        courseCode: "MATH-601",
        title: "Algèbre Fondamentale & Géométrie dans l'Espace",
        description: "Maîtrise des calculs algébriques, équations du premier degré, fractions rationnelles et théorèmes géométriques.",
        classNameTarget: "6ème",
        subjectNameTarget: "Math",
        status: "Published",
        modules: [
          {
            title: "Module 1 : Arithmétique & Fractions Rationnelles",
            description: "Propriétés des nombres, divisibilité et calculs fractionnaires.",
            lessons: [
              {
                title: "Leçon 1.1 : Les fractions et opérations de base",
                content: "<h3>Objectifs pédagogiques</h3><p>Comprendre l'addition, la soustraction et la multiplication de fractions rationnelles.</p><h4>Définition</h4><p>Une fraction est le quotient de deux entiers relatifs a et b avec b ≠ 0. Pour additionner deux fractions de dénominateurs différents, on les réduit au même dénominateur commun.</p><div style='background:#f1f5f9;padding:12px;border-radius:8px;'><strong>Règle fondamentale :</strong> a/b + c/b = (a+c)/b</div>",
                videoUrl: "https://www.youtube.com/watch?v=kITJ6qH7jS0",
                duration: 25,
                contentType: "Video",
              },
              {
                title: "Leçon 1.2 : Nombres premiers et décomposition",
                content: "<h3>Notion de nombre premier</h3><p>Un nombre entier naturel supérieur à 1 est premier s'il possède exactement deux diviseurs distincts : 1 et lui-même.</p><p>Exemples : 2, 3, 5, 7, 11, 13, 17, 19, 23, 29...</p>",
                duration: 20,
                contentType: "Text",
              }
            ]
          },
          {
            title: "Module 2 : Équations & Systèmes Linéaires",
            description: "Résolution pas-à-pas des équations ax + b = c.",
            lessons: [
              {
                title: "Leçon 2.1 : Résolution algébrique des équations",
                content: "<h3>Méthodologie de résolution</h3><p>1. Isoler les termes en x d'un côté de l'égalité.<br>2. Réduire les constantes de l'autre côté.<br>3. Diviser par le coefficient directeur.</p>",
                videoUrl: "https://www.youtube.com/watch?v=VuhfZT_qQDE",
                duration: 30,
                contentType: "Video",
              }
            ]
          }
        ],
        quizzes: [
          {
            title: "Quiz Express : Algèbre & Calcul Fractionnaire",
            description: "Évaluation rapide de 15 minutes sur les fractions et équations.",
            durationMin: 15,
            passingScore: 12.0,
            questions: [
              {
                questionText: "Quelle est la somme de 1/3 et 1/6 ?",
                points: 5,
                answers: [
                  { answerText: "1/2", isCorrect: true, explanation: "1/3 = 2/6, donc 2/6 + 1/6 = 3/6 = 1/2." },
                  { answerText: "2/9", isCorrect: false },
                  { answerText: "1/9", isCorrect: false },
                  { answerText: "2/6", isCorrect: false },
                ]
              },
              {
                questionText: "Quel est le plus petit nombre premier pair ?",
                points: 5,
                answers: [
                  { answerText: "2", isCorrect: true, explanation: "2 est le seul nombre premier qui soit pair." },
                  { answerText: "0", isCorrect: false },
                  { answerText: "1", isCorrect: false },
                  { answerText: "4", isCorrect: false },
                ]
              },
              {
                questionText: "Si 2x + 4 = 10, que vaut x ?",
                points: 10,
                answers: [
                  { answerText: "3", isCorrect: true, explanation: "2x = 10 - 4 = 6 => x = 3." },
                  { answerText: "2", isCorrect: false },
                  { answerText: "7", isCorrect: false },
                  { answerText: "5", isCorrect: false },
                ]
              }
            ]
          }
        ],
        assignment: {
          title: "DM 1 : Problèmes d'Algèbre & Résolution d'Équations",
          description: "Résoudre les 4 exercices de la fiche d'application. Rédiger soigneusement les étapes de calcul et justifier les propriétés géométriques.",
          dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
          maxScore: 20.0,
        }
      },
      {
        courseCode: "PHYS-501",
        title: "Physique & Chimie : De la Matière à l'Énergie",
        description: "Étude des états de la matière, des transformations chimiques, de la vitesse de la lumière et des circuits électriques.",
        classNameTarget: "5ème",
        subjectNameTarget: "Physique",
        status: "Published",
        modules: [
          {
            title: "Module 1 : Circuits Électriques & Lois Fondamentales",
            description: "Tension, intensité et loi d'Ohm.",
            lessons: [
              {
                title: "Leçon 1.1 : Loi d'Ohm et résistance électrique",
                content: "<h3>Loi d'Ohm</h3><p>La tension U aux bornes d'un dipôle ohmique est proportionnelle à l'intensité I du courant qui le traverse : <strong>U = R × I</strong>.</p><p>Unités : U en Volts (V), R en Ohms (Ω), I en Ampères (A).</p>",
                videoUrl: "https://www.youtube.com/watch?v=HsLLq6Rm5tU",
                duration: 25,
                contentType: "Video",
              }
            ]
          }
        ],
        quizzes: [
          {
            title: "Quiz : Circuits Électriques & Unités Physiques",
            description: "Vérification des connaissances sur la loi d'Ohm et les unités SI.",
            durationMin: 15,
            passingScore: 10.0,
            questions: [
              {
                questionText: "Quelle est l'unité de la résistance électrique ?",
                points: 10,
                answers: [
                  { answerText: "Ohm (Ω)", isCorrect: true },
                  { answerText: "Volt (V)", isCorrect: false },
                  { answerText: "Watt (W)", isCorrect: false },
                  { answerText: "Ampère (A)", isCorrect: false },
                ]
              },
              {
                questionText: "Dans la formule U = R × I, que représente I ?",
                points: 10,
                answers: [
                  { answerText: "L'intensité du courant électrique", isCorrect: true },
                  { answerText: "L'inertie mécanique", isCorrect: false },
                  { answerText: "L'indice de réfraction", isCorrect: false },
                  { answerText: "L'impédance thermique", isCorrect: false },
                ]
              }
            ]
          }
        ],
        assignment: {
          title: "Compte-rendu de TP : Mesure de la résistance d'un conducteur ohmique",
          description: "Tracer la caractéristique U = f(I) sur papier millimétré ou tableur et déterminer la valeur expérimentale de la résistance R.",
          dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
          maxScore: 20.0,
        }
      },
      {
        courseCode: "INFO-301",
        title: "Algorithmique & Programmation Python / Web",
        description: "Introduction à la pensée computationnelle, structures de données, boucles, fonctions et développement web moderne.",
        classNameTarget: "3ème",
        subjectNameTarget: "Info",
        status: "Published",
        modules: [
          {
            title: "Module 1 : Variables, Conditions et Boucles Python",
            description: "Les bases du code propre en Python 3.",
            lessons: [
              {
                title: "Leçon 1.1 : Premiers pas avec Python et typage dynamique",
                content: "<h3>Introduction à Python</h3><p>Python est un langage interprété, lisible et puissant.</p><pre style='background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;'><code>def saluer(nom):\n    return f'Bonjour {nom} !'\nprint(saluer('Élève'))</code></pre>",
                videoUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
                duration: 35,
                contentType: "Video",
              }
            ]
          }
        ],
        quizzes: [
          {
            title: "Quiz Python : Syntaxe & Logique de Programmation",
            description: "Testez vos connaissances en structures conditionnelles et boucles.",
            durationMin: 20,
            passingScore: 10.0,
            questions: [
              {
                questionText: "Quel mot-clé permet de définir une fonction en Python ?",
                points: 10,
                answers: [
                  { answerText: "def", isCorrect: true },
                  { answerText: "function", isCorrect: false },
                  { answerText: "func", isCorrect: false },
                  { answerText: "lambda_fun", isCorrect: false },
                ]
              },
              {
                questionText: "Quel est le résultat de len([10, 20, 30]) ?",
                points: 10,
                answers: [
                  { answerText: "3", isCorrect: true },
                  { answerText: "2", isCorrect: false },
                  { answerText: "30", isCorrect: false },
                  { answerText: "Erreur", isCorrect: false },
                ]
              }
            ]
          }
        ],
        assignment: {
          title: "Projet Mini-Code : Calculateur de moyennes trimestrielles",
          description: "Écrire un script Python qui demande les notes de l'élève, calcule la moyenne pondérée avec coefficients et affiche la mention.",
          dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          maxScore: 20.0,
        }
      },
      {
        courseCode: "FRAN-401",
        title: "Littérature, Rhétorique & Expression Écrite",
        description: "Analyse des genres littéraires, figures de style, rédaction argumentative et enrichissement du vocabulaire.",
        classNameTarget: "4ème",
        subjectNameTarget: "Fran",
        status: "Published",
        modules: [
          {
            title: "Module 1 : L'Art du Récit & Figures de Style",
            description: "Identifier métaphores, comparaisons, allégories et hyperboles.",
            lessons: [
              {
                title: "Leçon 1.1 : Les figures d'analogie et d'insistance",
                content: "<h3>Les figures de style majeures</h3><p><strong>La métaphore :</strong> une assimilation directe sans outil de comparaison (ex : 'Cet homme est un lion').</p><p><strong>La comparaison :</strong> rapprochement avec outil comparatif ('comme', 'tel que').</p>",
                duration: 20,
                contentType: "Text",
              }
            ]
          }
        ],
        quizzes: [],
        assignment: {
          title: "Rédaction argumentative : Pour ou contre l'usage des smartphones en classe ?",
          description: "Rédiger une argumentation structurée de 350 mots comprenant introduction, deux arguments avec exemples et conclusion.",
          dueDate: new Date(Date.now() + 6 * 24 * 3600 * 1000),
          maxScore: 20.0,
        }
      },
      {
        courseCode: "ANGL-101",
        title: "English for International Communication & TOEFL Prep",
        description: "Oral comprehension, grammar mastery, vocabulary expansion, and essay writing skills.",
        classNameTarget: "Terminale",
        subjectNameTarget: "Angl",
        status: "Published",
        modules: [
          {
            title: "Module 1 : Mastering Advanced Tenses & Modals",
            description: "Present perfect, past perfect, conditionals, and modal verbs.",
            lessons: [
              {
                title: "Leçon 1.1 : Present Perfect vs Simple Past",
                content: "<h3>Grammar Workshop</h3><p>Use the Present Perfect for actions connected to the present moment, and Simple Past for completed past events with a specific time anchor.</p>",
                videoUrl: "https://www.youtube.com/watch?v=O1CHtTzO3rE",
                duration: 25,
                contentType: "Video",
              }
            ]
          }
        ],
        quizzes: [],
        assignment: null
      },
      {
        courseCode: "HIST-201",
        title: "Histoire Universelle & Géopolitique Contemporaine",
        description: "Les grandes étapes de l'histoire moderne, mondialisation, gouvernance internationale et enjeux climatiques.",
        classNameTarget: "Seconde",
        subjectNameTarget: "Hist",
        status: "Published",
        modules: [
          {
            title: "Module 1 : Les Mutations du Monde Contemporain",
            description: "Démographie, urbanisation et flux migratoires globaux.",
            lessons: [
              {
                title: "Leçon 1.1 : La transition démographique mondiale",
                content: "<h3>Schéma de la transition démographique</h3><p>Comprendre le passage d'un régime traditionnel à forte natalité et mortalité vers un régime moderne équilibré.</p>",
                duration: 30,
                contentType: "Text",
              }
            ]
          }
        ],
        quizzes: [],
        assignment: null
      }
    ];

    // Seed Courses, Modules, Lessons, Quizzes, Assignments
    let seededCoursesCount = 0;
    for (const cDef of sampleCoursesDefs) {
      const targetClass = classes.find(c => c.className.toLowerCase().includes(cDef.classNameTarget.toLowerCase())) || classes[0];
      const targetSubject = subjects.find(s => s.subjectName.toLowerCase().includes(cDef.subjectNameTarget.toLowerCase())) || subjects[0];

      // Insert Course
      const [newCourse] = await db.insert(lmsCourses).values({
        courseCode: cDef.courseCode,
        title: cDef.title,
        description: cDef.description,
        classId: targetClass?.id || null,
        subjectId: targetSubject?.id || null,
        teacherId: defaultTeacherId,
        status: cDef.status,
      }).returning();
      seededCoursesCount++;

      // Enroll students in this course
      for (const student of schoolStudents.slice(0, 8)) {
        try {
          await db.insert(lmsEnrollments).values({
            courseId: newCourse.id,
            studentId: student.id,
            status: "Active",
          });
        } catch (_) {}
      }

      // Insert Modules and Lessons
      for (let mIdx = 0; mIdx < cDef.modules.length; mIdx++) {
        const mDef = cDef.modules[mIdx];
        const [newModule] = await db.insert(lmsModules).values({
          courseId: newCourse.id,
          title: mDef.title,
          description: mDef.description,
          displayOrder: mIdx + 1,
          status: "Active",
        }).returning();

        for (let lIdx = 0; lIdx < mDef.lessons.length; lIdx++) {
          const lDef = mDef.lessons[lIdx];
          let newLesson: any = null;
          try {
            const [inserted] = await db.insert(lmsLessons).values({
              courseId: newCourse.id,
              moduleId: newModule.id,
              classId: targetClass?.id || null,
              subjectId: targetSubject?.id || null,
              title: lDef.title,
              content: lDef.content,
              videoUrl: (lDef as any).videoUrl || null,
              duration: lDef.duration || 20,
              contentType: lDef.contentType || "Text",
              displayOrder: lIdx + 1,
            }).returning();
            newLesson = inserted;
          } catch (eLesson) {
            console.warn("Retrying lesson insert with basic fields:", eLesson);
            try {
              const [insertedFallback] = await db.insert(lmsLessons).values({
                courseId: newCourse.id,
                moduleId: newModule.id,
                title: lDef.title,
                content: lDef.content,
                videoUrl: (lDef as any).videoUrl || null,
                duration: lDef.duration || 20,
                contentType: lDef.contentType || "Text",
                displayOrder: lIdx + 1,
              }).returning();
              newLesson = insertedFallback;
            } catch (errFallback) {
              console.error("Lesson fallback insert failed:", errFallback);
            }
          }

          // Add progress for students
          if (newLesson?.id) {
            for (let sIdx = 0; sIdx < schoolStudents.slice(0, 6).length; sIdx++) {
              const student = schoolStudents[sIdx];
              const isDone = sIdx < 3; // First 3 students completed all lessons
              try {
                await db.insert(lmsProgress).values({
                  studentId: student.id,
                  lessonId: newLesson.id,
                  isCompleted: isDone,
                  completedAt: isDone ? new Date() : null,
                  lastPosition: isDone ? 100 : 30,
                });
              } catch (_) {}
            }
          }
        }
      }

      // Insert Quizzes
      for (const qDef of cDef.quizzes) {
        const [newQuiz] = await db.insert(lmsQuizzes).values({
          courseId: newCourse.id,
          title: qDef.title,
          description: qDef.description,
          durationMin: qDef.durationMin,
          passingScore: qDef.passingScore,
          status: "Active",
        }).returning();

        for (let qIdx = 0; qIdx < qDef.questions.length; qIdx++) {
          const questDef = qDef.questions[qIdx];
          const [newQuestion] = await db.insert(lmsQuestions).values({
            quizId: newQuiz.id,
            questionText: questDef.questionText,
            questionType: "QCM",
            points: questDef.points,
            displayOrder: qIdx + 1,
          }).returning();

          for (const ans of questDef.answers) {
            await db.insert(lmsAnswers).values({
              questionId: newQuestion.id,
              answerText: ans.answerText,
              isCorrect: ans.isCorrect,
              explanation: ans.explanation || null,
            });
          }
        }
      }

      // Insert Assignment & sample submissions
      if (cDef.assignment) {
        const [newAssignment] = await db.insert(lmsAssignments).values({
          courseId: newCourse.id,
          classId: targetClass?.id || null,
          subjectId: targetSubject?.id || null,
          title: cDef.assignment.title,
          description: cDef.assignment.description,
          dueDate: cDef.assignment.dueDate,
          maxScore: cDef.assignment.maxScore,
          status: "Active",
        }).returning();

        // Sample student submissions
        if (schoolStudents.length > 0) {
          try {
            await db.insert(lmsSubmissions).values([
              {
                assignmentId: newAssignment.id,
                studentId: schoolStudents[0].id,
                fileReponsePath: "/uploads/devoir_eleve1.pdf",
                score: 18.5,
                comment: "Excellent travail ! Démarche rigoureuse et démonstrations bien formulées.",
                isGraded: true,
              },
              {
                assignmentId: newAssignment.id,
                studentId: schoolStudents[1]?.id || schoolStudents[0].id,
                fileReponsePath: "/uploads/devoir_eleve2.pdf",
                score: 15.0,
                comment: "Bonne compréhension d'ensemble, attention aux étourderies de calculs à l'exercice 2.",
                isGraded: true,
              },
              {
                assignmentId: newAssignment.id,
                studentId: schoolStudents[2]?.id || schoolStudents[0].id,
                fileReponsePath: "/uploads/devoir_eleve3.pdf",
                score: null,
                comment: null,
                isGraded: false, // 1 submission awaiting grading
              }
            ]);
          } catch (_) {}
        }
      }

      // Insert Forum Discussions
      if (schoolStudents.length > 0) {
        try {
          await db.insert(lmsDiscussions).values([
            {
              courseId: newCourse.id,
              employeeId: defaultTeacherId,
              message: `Bienvenue à tous sur l'espace d'apprentissage du cours ${cDef.title} ! Consultez les ressources et posez vos questions ici.`,
            },
            {
              courseId: newCourse.id,
              studentId: schoolStudents[0].id,
              message: "Bonjour Professeur, merci beaucoup ! Les vidéos et supports de révision sont très clairs.",
            }
          ]);
        } catch (_) {}
      }

      // Insert Certificates for students who completed course
      if (schoolStudents.length >= 2) {
        try {
          await db.insert(lmsCertificates).values([
            {
              courseId: newCourse.id,
              studentId: schoolStudents[0].id,
              certificateCode: `CERT-LMS-${newCourse.id}-${schoolStudents[0].id}-${new Date().getFullYear()}`,
              issueDate: new Date(),
            },
            {
              courseId: newCourse.id,
              studentId: schoolStudents[1].id,
              certificateCode: `CERT-LMS-${newCourse.id}-${schoolStudents[1].id}-${new Date().getFullYear()}`,
              issueDate: new Date(),
            }
          ]);
        } catch (_) {}
      }
    }

    // 6. Seed Virtual Live Classes
    const targetClass = classes[0];
    const targetSubject = subjects[0];
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    tomorrow.setHours(10, 0, 0, 0);

    const inThreeDays = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    inThreeDays.setHours(14, 30, 0, 0);

    const pastSession = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    pastSession.setHours(9, 0, 0, 0);

    try {
      const [live1] = await db.insert(lmsVirtualClasses).values({
        title: "Direct Interactif : Résolution des équations & Exercices types",
        classId: targetClass?.id || null,
        subjectId: targetSubject?.id || null,
        teacherId: defaultTeacherId,
        sessionDate: tomorrow,
        duration: 60,
        meetingUrl: "https://meet.jit.si/EdutVirtualClass-Maths-Live",
        meetingPassword: "Edut" + new Date().getFullYear(),
        platform: "Jitsi Meet",
        status: "À venir",
      }).returning();

      await db.insert(lmsVirtualClasses).values({
        title: "Atelier Coding : Découverte des algorithmes et projets Python",
        classId: classes[1]?.id || targetClass?.id || null,
        subjectId: subjects[3]?.id || targetSubject?.id || null,
        teacherId: defaultTeacherId,
        sessionDate: inThreeDays,
        duration: 45,
        meetingUrl: "https://meet.jit.si/EdutVirtualClass-Coding-Workshop",
        meetingPassword: "Code" + new Date().getFullYear(),
        platform: "Google Meet",
        status: "À venir",
      });

      const [livePast] = await db.insert(lmsVirtualClasses).values({
        title: "Session de méthodologie et révision générale du trimestre",
        classId: targetClass?.id || null,
        subjectId: targetSubject?.id || null,
        teacherId: defaultTeacherId,
        sessionDate: pastSession,
        duration: 50,
        meetingUrl: "https://meet.jit.si/EdutVirtualClass-Revision-Archive",
        platform: "Teams",
        status: "Terminée",
        recordingUrl: "https://www.youtube.com/watch?v=kITJ6qH7jS0",
      }).returning();

      // Add attendance to past session
      for (const student of schoolStudents.slice(0, 8)) {
        try {
          await db.insert(lmsVirtualAttendance).values({
            virtualClassId: livePast.id,
            studentId: student.id,
            status: "Present",
            durationMinutes: 48,
          });
        } catch (_) {}
      }
    } catch (_) {}

    revalidatePath("/dashboard/lms");
    return { success: true, count: seededCoursesCount };
  });
}
