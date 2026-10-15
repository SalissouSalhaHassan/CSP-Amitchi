import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== COUNT OF STUDENTS BY LEVEL FOR SCHOOL 1 ===");
    const counts = await sql`
      SELECT educational_level, COUNT(*)::int as count 
      FROM students 
      WHERE school_id = 1
      GROUP BY educational_level
    `;
    console.log(counts);
  } catch (err: any) {
    console.error("❌ Failed to query student levels:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
