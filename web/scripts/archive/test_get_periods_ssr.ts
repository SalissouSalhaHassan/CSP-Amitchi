import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function testGetPeriods() {
  try {
    console.log("🔍 Fetching all academic_periods directly from Remote DB...");
    const periods = await client`
      SELECT ap.id, ap.name, ap.period_type, ap.session_id, ap.school_id, ss.session_name
      FROM academic_periods ap
      LEFT JOIN school_sessions ss ON ap.session_id = ss.id
      ORDER BY ap.id;
    `;
    console.log("📊 Total DB academic_periods count:", periods.length);
    console.log("Data sample:", periods);

    const sessions = await client`SELECT id, session_name, school_id, is_active FROM school_sessions ORDER BY id;`;
    console.log("📊 Total DB school_sessions count:", sessions.length);
    console.log("Sessions sample:", sessions);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit(0);
  }
}

testGetPeriods();
