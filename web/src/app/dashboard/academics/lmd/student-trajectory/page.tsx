import { Metadata } from "next";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { eq, desc } from "drizzle-orm";
import { StudentTrajectoryClient } from "./student-trajectory-client";
import { getStudentLmdTrajectoryData } from "@/domains/academics/actions/lmd-student.actions";

export const metadata: Metadata = {
  title: "Portail Étudiant LMD • Suivi de Trajectoire & Crédits ECTS | EDUT",
  description: "Suivi individuel des crédits ECTS, moyenne générale du cycle et progression académique LMD",
};

export default async function StudentTrajectoryPage() {
  // Fetch list of students for search & selector
  const allStudents = await (readDb || db)
    .select({
      id: students.id,
      nom: students.nomEtudiant,
      matricule: students.numAdmission,
      classId: students.classId,
    })
    .from(students)
    .orderBy(desc(students.id))
    .limit(50);

  const studentItems = allStudents.map((s) => ({
    id: s.id,
    nom: s.nom,
    matricule: s.matricule || `EDUT-${s.id}`,
  }));

  const firstStudent = studentItems[0];
  let initialTrajectory = null;

  if (firstStudent) {
    const res = await getStudentLmdTrajectoryData(firstStudent.id);
    if (res.success && res.data) {
      initialTrajectory = res.data;
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <StudentTrajectoryClient
        initialTrajectory={initialTrajectory}
        studentsList={studentItems}
      />
    </div>
  );
}
