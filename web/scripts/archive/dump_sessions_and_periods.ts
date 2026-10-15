import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function dumpSessionsAndPeriods() {
  try {
    console.log("🔍 Dump of all school_sessions in Remote Supabase DB:");
    const sessions = await client`
      SELECT id, session_name, school_id, is_active, status, created_at
      FROM school_sessions
      ORDER BY id ASC;
    `;
    console.log("📊 Total sessions in DB:", sessions.length);
    console.table(sessions);

    console.log("\n🔍 Dump of all academic_periods summary by school_id & session_id:");
    const periodsSummary = await client`
      SELECT school_id, session_id, count(*) as period_count
      FROM academic_periods
      GROUP BY school_id, session_id
      ORDER BY school_id, session_id;
    `;
    console.table(periodsSummary);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error dumping DB:", err);
    process.exit(1);
  }
}

dumpSessionsAndPeriods();
