import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🔌 Connecting to Supabase Remote DB Pooler for Diagnosis...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function diagnoseInsert() {
  try {
    console.log("🔍 Testing exact insert query that failed on UI...");
    
    // Attempt the exact insert
    const res = await client`
      INSERT INTO academic_periods (school_id, name, period_type, session_id, is_active)
      VALUES (9, '1er Semestre Test', 'Semestre', 10, true)
      RETURNING *;
    `;
    console.log("✅ SUCCESS! Inserted row:", res);
    
    // Clean up test row
    await client`DELETE FROM academic_periods WHERE id = ${res[0].id}`;
    console.log("🧹 Cleaned up test row.");
  } catch (error: any) {
    console.error("❌ EXACT DIAGNOSTIC ERROR FROM POSTGRES:");
    console.error("Name:", error?.name);
    console.error("Message:", error?.message);
    console.error("Code:", error?.code);
    console.error("Detail:", error?.detail);
    console.error("Hint:", error?.hint);
    console.error("Constraint:", error?.constraint_name || error?.constraint);
    console.error("Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  } finally {
    process.exit(0);
  }
}

diagnoseInsert();
