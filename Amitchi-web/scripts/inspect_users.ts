import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  console.log("=== USERS ===");
  const users = await sql`SELECT id, school_id, email, utilisateur, nom_prenom, role_id, admin, super_admin, educational_level FROM users`;
  console.log(users);

  console.log("=== SESSIONS ===");
  const sessions = await sql`SELECT * FROM school_sessions`;
  console.log(sessions);

  console.log("=== STUDENT FEES SAMPLES ===");
  const fees = await sql`SELECT id, school_id, student_id, session_id, total_expected, total_paid, balance, status FROM student_fees LIMIT 10`;
  console.log(fees);

  await sql.end();
}

main().catch(console.error);
