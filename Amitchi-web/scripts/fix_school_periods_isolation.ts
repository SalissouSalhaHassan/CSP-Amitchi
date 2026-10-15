import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("🛠️ Connecting to Supabase Remote DB to fix Multi-Tenant Period Isolation...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function fixPeriodIsolation() {
  try {
    console.log("🔍 1. Inspecting academic_periods and matching with school_sessions...");

    // Update academic_periods.school_id to match the school_id of their associated session
    const updateRes = await client`
      UPDATE academic_periods p
      SET school_id = s.school_id
      FROM school_sessions s
      WHERE p.session_id = s.id
        AND s.school_id IS NOT NULL
        AND (p.school_id IS NULL OR p.school_id <> s.school_id);
    `;

    console.log(`✅ Updated ${updateRes.count} period records to strictly match their school's session school_id.`);

    // Check remaining periods with NULL school_id or orphan periods
    const orphanPeriods = await client`
      SELECT id, name, session_id, school_id 
      FROM academic_periods 
      WHERE school_id IS NULL;
    `;

    console.log(`📌 Remaining orphan periods with NULL school_id: ${orphanPeriods.length}`);
    if (orphanPeriods.length > 0) {
      console.table(orphanPeriods);
      // Clean orphan periods without school_id to avoid leakage across schools
      const deleteOrphans = await client`
        DELETE FROM academic_periods WHERE school_id IS NULL;
      `;
      console.log(`🧹 Cleaned ${deleteOrphans.count} unassigned orphan periods to guarantee total tenant isolation.`);
    }

    console.log("====================================================================");
    console.log("🎉 MULTI-TENANT PERIOD ISOLATION FIX COMPLETED SUCCESSFULLY!");
    console.log("====================================================================");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fixing period isolation:", err);
    process.exit(1);
  }
}

fixPeriodIsolation();
