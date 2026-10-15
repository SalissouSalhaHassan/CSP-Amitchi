import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🛠️ Connecting to Supabase Remote DB to fix Multi-Tenant Academic Sessions Isolation...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function fixSessionIsolation() {
  try {
    console.log("🔍 1. Inspecting school_sessions table...");

    const allSessions = await client`
      SELECT id, session_name, school_id, is_active 
      FROM school_sessions;
    `;
    console.log(`📌 Total academic sessions found in DB: ${allSessions.length}`);

    // Clean any orphan sessions with NULL school_id to avoid leakage across schools
    const deleteOrphanSessions = await client`
      DELETE FROM school_sessions WHERE school_id IS NULL;
    `;
    console.log(`🧹 Cleaned ${deleteOrphanSessions.count} unassigned orphan sessions with NULL school_id.`);

    console.log("====================================================================");
    console.log("🎉 MULTI-TENANT ACADEMIC SESSION ISOLATION COMPLETED SUCCESSFULLY!");
    console.log("====================================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing session isolation:", err);
    process.exit(1);
  }
}

fixSessionIsolation();
