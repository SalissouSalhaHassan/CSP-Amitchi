import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { students } from "@/infrastructure/database/schema/students";
import { classSubjects } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { verifyParentChildRelationship } from "../../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const studentId = Number(params.id);
  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    const student = await readDb.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable", 404);
    }

    if (schoolId && student.schoolId !== schoolId) {
      return mobileJsonError("Accès refusé. Autre école.", 403);
    }

    // Role verification
    if (roleType === "parent" || roleType === "eleve") {
      const isLinked = await verifyParentChildRelationship(user, studentId);
      if (!isLinked) {
        return mobileJsonError("Accès refusé. Dossier non lié.", 403);
      }
    } else if (roleType === "teacher" || roleType === "enseignant") {
      if (student.classe) {
        const teachingAssignments = await readDb.query.classSubjects.findMany({
          where: eq(classSubjects.employeeId, user.employeeId || 0),
          with: { class: true }
        });
        const allowedClasses = new Set(teachingAssignments.map((a) => a.class?.className));
        if (!allowedClasses.has(student.classe)) {
          return mobileJsonError("Accès refusé. Vous n'enseignez pas cet élève.", 403);
        }
      } else {
        return mobileJsonError("Accès refusé.", 403);
      }
    }

    const rows = await readDb.query.studentAttendance.findMany({
      where: eq(studentAttendance.studentId, studentId),
      with: {
        subject: true
      },
      orderBy: [desc(studentAttendance.date)]
    });

    const data = rows.map((r) => ({
      id: r.id,
      student_id: r.studentId,
      class_id: r.classId,
      subject_id: r.subjectId,
      date: r.date?.toISOString() || null,
      status: r.status,
      remark: r.remark,
      school_subjects: r.subject ? { subject_name: r.subject.subjectName } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
