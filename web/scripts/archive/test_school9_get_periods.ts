import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function testSchool9Periods() {
  try {
    console.log("🔍 Diagnosing School 9 periods & sessions relation...");
    
    // Check academic_periods for school_id = 9
    const periods = await client`
      SELECT ap.id, ap.name, ap.period_type, ap.session_id, ap.school_id, ss.session_name, ss.is_active as session_is_active
      FROM academic_periods ap
      LEFT JOIN school_sessions ss ON ap.session_id = ss.id
      WHERE ap.school_id = 9;
    `;
    console.log("📊 Total periods for school_id 9:", periods.length);
    console.log("Periods sample for school 9:", periods);

    // Check sessions for school 9
    const sessions = await client`
      SELECT id, session_name, school_id, is_active 
      FROM school_sessions 
      WHERE school_id = 9;
    `;
    console.log("📊 Total sessions for school_id 9:", sessions.length);
    console.log("Sessions sample for school 9:", sessions);
  } catch (e) {
    console.error("❌ Diagnostic error:", e);
  } finally {
    process.exit(0);
  }
}

testSchool9Periods();
