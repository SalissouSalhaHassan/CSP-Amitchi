import { db } from "../src/infrastructure/database";
import { students } from "../src/infrastructure/database/schema/students";
import { studentFees } from "../src/infrastructure/database/schema/finance";
import { count, eq } from "drizzle-orm";

async function main() {
  const totalStudents = await db.select({ value: count() }).from(students);
  const activeStudents = await db.select({ value: count() }).from(students).where(eq(students.statut, "Actif"));
  const totalFees = await db.select({ value: count() }).from(studentFees);
  
  console.log(`Total students in DB: ${totalStudents[0].value}`);
  console.log(`Active students in DB: ${activeStudents[0].value}`);
  console.log(`Total fee records in DB: ${totalFees[0].value}`);

  // Check unique student names or admission numbers
  const allSt = await db.query.students.findMany({
    columns: { id: true, nomEtudiant: true, numAdmission: true }
  });

  const uniqueNames = new Set(allSt.map(s => s.nomEtudiant));
  const uniqueAdmissions = new Set(allSt.map(s => s.numAdmission));

  console.log(`Unique student names: ${uniqueNames.size}`);
  console.log(`Unique admission numbers: ${uniqueAdmissions.size}`);
}

main().catch(console.error);
