import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== SESSIONS ===");
  const sessions = await sql`SELECT id, school_id, session_name, is_active, status FROM school_sessions`;
  console.log(sessions);

  console.log("\n=== STUDENTS SAMPLES & COUNTS ===");
  const studentsCount = await sql`SELECT school_id, session, count(*) FROM students GROUP BY school_id, session`;
  console.log(studentsCount);

  const studentSample = await sql`SELECT id, school_id, nom_etudiant, classe, frais_mensuels, ancien_solde, frais_inscription FROM students WHERE school_id = 9 LIMIT 5`;
  console.log(studentSample);

  console.log("\n=== STUDENT FEES COUNTS ===");
  const feesCount = await sql`SELECT school_id, session_id, count(*) FROM student_fees GROUP BY school_id, session_id`;
  console.log(feesCount);

  console.log("\n=== FEE PAYMENTS COUNTS ===");
  const paymentsCount = await sql`SELECT school_id, count(*), sum(amount) as total_amount FROM fee_payments GROUP BY school_id`;
  console.log(paymentsCount);

  await sql.end();
}

main().catch(console.error);
