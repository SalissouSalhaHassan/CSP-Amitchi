import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== CHECK STUDENT FEES JOIN STUDENTS ===");
  const feesWithStudents = await sql`
    SELECT sf.id, sf.school_id, sf.student_id, sf.session_id, sf.total_expected, sf.total_paid, sf.balance, sf.status,
           s.nom_etudiant, s.classe, s.educational_level
    FROM student_fees sf
    LEFT JOIN students s ON sf.student_id = s.id
    WHERE sf.school_id = 9 OR sf.school_id IS NULL
    LIMIT 10
  `;
  console.log(feesWithStudents);

  const statsExpected = await sql`
    SELECT COUNT(*) as total_count, SUM(total_expected) as sum_expected, SUM(total_paid) as sum_paid, SUM(balance) as sum_balance
    FROM student_fees
    WHERE school_id = 9
  `;
  console.log("Stats expected for school 9:", statsExpected);

  await sql.end();
}

main().catch(console.error);
