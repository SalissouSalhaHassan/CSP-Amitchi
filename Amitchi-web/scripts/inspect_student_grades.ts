import { readDb } from "../src/infrastructure/database";
import { students, studentResults, schoolSubjects, schoolClasses, lmdUnitesEnseignement, lmdElementsConstitutifs, universityPrograms } from "../src/infrastructure/database/schema";
import { eq, or } from "drizzle-orm";

async function main() {
  const st = await readDb.query.students.findFirst({
    where: eq(students.numAdmission, "EDUT-2024-000347")
  });
  console.log("STUDENT:", st?.id, st?.nomEtudiant, "ClassId:", st?.classId);

  if (st) {
    const res = await readDb.query.studentResults.findMany({
      where: eq(studentResults.studentId, st.id),
      with: {
        subject: true,
        class: true
      }
    });
    console.log("RESULTS COUNT:", res.length);
    res.forEach(r => {
      console.log(`- Subject: ${r.subject?.subjectName} (ID: ${r.subjectId}) | Class: ${r.class?.className} (ID: ${r.classId}) | Term: "${r.term}" | Exam: ${r.examScore} | CW: ${r.classWorkScore} | Total: ${r.totalScore} | Coef: ${r.coefficient}`);
    });

    const progs = await readDb.query.universityPrograms.findMany();
    console.log("PROGRAMS:", progs.map(p => ({ id: p.id, name: p.name, sectionId: p.sectionId })));

    const ues = await readDb.query.lmdUnitesEnseignement.findMany({
      with: { elementsConstitutifs: true }
    });
    console.log("TOTAL UES:", ues.length);
    ues.forEach(u => {
      console.log(`UE: ${u.id} - ${u.nameUe} (${u.codeUe}) | ProgId: ${u.programId} | Sem: ${u.semester}`);
      u.elementsConstitutifs?.forEach(e => {
        console.log(`   ECU: ${e.id} - ${e.nameEcu} | SubjectId: ${e.subjectId} | Coef: ${e.coefficient} | ECTS: ${e.creditsEcts}`);
      });
    });
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
