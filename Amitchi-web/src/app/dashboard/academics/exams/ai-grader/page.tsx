import { redirect } from "next/navigation";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db } from "@/infrastructure/database";
import { exams, schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, or, isNull } from "drizzle-orm";
import AiCameraGraderClient from "./ai-grader-client";

export const metadata = {
  title: "Correcteur d'Examens IA Caméra — Edut",
  description: "Correction automatique des copies d'examen par intelligence artificielle et vision par ordinateur",
};

export default async function AiCameraGraderPage() {
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

  // Fetch available exams
  const examList = await db.query.exams.findMany({
    where: or(
      eq(exams.schoolId, schoolId),
      isNull(exams.schoolId)
    ),
    with: {
      class: true,
      subject: true,
      period: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const formattedExams = examList.map((e: any) => ({
    id: e.id,
    examName: e.examName || "Examen",
    maxMarks: e.maxMarks || 20,
    class: e.class ? { id: e.class.id, className: e.class.className } : undefined,
    subject: e.subject ? { id: e.subject.id, subjectName: e.subject.subjectName } : undefined,
  }));

  // Fetch classes & students
  const classList = await db.query.schoolClasses.findMany({
    where: or(
      eq(schoolClasses.schoolId, schoolId),
      isNull(schoolClasses.schoolId)
    ),
    orderBy: (t, { asc }) => [asc(t.className)],
  });

  const studentList = await db.query.students.findMany({
    where: or(
      eq(students.schoolId, schoolId),
      isNull(students.schoolId)
    ),
    orderBy: (t, { asc }) => [asc(t.nomEtudiant)],
  });

  const formattedStudents = studentList.map((s: any) => ({
    id: s.id,
    firstName: s.nomEtudiant || "Élève",
    lastName: s.prenomEtudiant || "",
    admissionNumber: s.numAdmission || "",
    classId: s.classId || undefined,
  }));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <AiCameraGraderClient
        schoolId={schoolId}
        exams={formattedExams}
        classes={classList}
        students={formattedStudents}
      />
    </div>
  );
}
