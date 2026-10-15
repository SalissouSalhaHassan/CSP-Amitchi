import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("⚠️ WARNING: Preparing to clear ALL grades, results, and term summaries from Supabase Remote DB...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function clearAllGrades() {
  try {
    console.log("🧹 Clearing student_results table...");
    await client`DELETE FROM student_results;`;

    console.log("🧹 Clearing student_term_summaries table...");
    await client`DELETE FROM student_term_summaries;`;

    console.log("🧹 Clearing exam_results table...");
    await client`DELETE FROM exam_results;`;

    console.log("🧹 Clearing exams table...");
    await client`DELETE FROM exams;`;

    console.log("✅ Successfully cleared ALL grades, exam results, and term summaries!");
    console.log("ℹ️ Note: Students, Classes, Subjects, and Academic Sessions remain intact.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error clearing grades:", err);
    process.exit(1);
  }
}

clearAllGrades();
