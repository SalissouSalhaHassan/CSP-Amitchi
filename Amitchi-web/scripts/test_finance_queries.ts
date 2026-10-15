import { getStudentFees, getAdvancedFinanceStats, getFinanceStats } from "../src/domains/finance/actions/finance.actions";
import { getCurrentUser } from "../src/domains/auth/services/session";
import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== CHECK USER 28 (aiiu@gmail.com) ===");
  const user = await sql`SELECT * FROM users WHERE id = 28`;
  console.log(user);

  console.log("\n=== CHECK STUDENT FEES ROWS FOR SCHOOL 9 ===");
  const sampleFees = await sql`
    SELECT sf.id, sf.school_id, sf.student_id, sf.session_id, sf.total_expected, sf.total_paid, sf.balance, sf.status, s.nom_etudiant, s.classe, s.educational_level 
    FROM student_fees sf 
    LEFT JOIN students s ON sf.student_id = s.id 
    WHERE sf.school_id = 9 
    LIMIT 5
  `;
  console.log(sampleFees);

  const activeSessionForSchool9 = await sql`
    SELECT * FROM school_sessions 
    WHERE school_id = 9 
    ORDER BY CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END, id DESC
  `;
  console.log("\n=== ACTIVE SESSIONS FOR SCHOOL 9 ===");
  console.log(activeSessionForSchool9);

  await sql.end();
}

main().catch(console.error);
