import { db } from "../src/infrastructure/database";
import { studentFees, feePayments } from "../src/infrastructure/database/schema/finance";
import { students } from "../src/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== DB DUMP ===");
  const fees = await db.query.studentFees.findMany({
    with: {
      student: true,
      payments: true
    }
  });

  console.log(`Total fee records: ${fees.length}`);
  const sample = fees.filter(f => f.student?.nomEtudiant?.includes("ADO") || f.payments.length > 0);
  for (const f of sample) {
    console.log(`Student: ${f.student?.nomEtudiant}`);
    console.log(`  fraisInscription: ${f.student?.fraisInscription}, fraisMensuels: ${f.student?.fraisMensuels}`);
    console.log(`  Expected (DB): ${f.totalExpected}, Paid (DB): ${f.totalPaid}, Balance (DB): ${f.balance}`);
    console.log(`  Payments count: ${f.payments.length}`);
    for (const p of f.payments) {
      console.log(`    Payment ID: ${p.id}, Amount: ${p.amount}, Date: ${p.datePaid}`);
    }
  }
}

main().catch(console.error);
