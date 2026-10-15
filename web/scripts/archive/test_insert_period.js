const postgres = require("postgres");

const remoteUrl =
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("=== Testing Insert into academic_periods ===");
    
    // Check sessions
    const sessions = await sql`SELECT id, session_name, school_id FROM school_sessions WHERE school_id = 9`;
    console.log("Sessions for school_id=9:", sessions);

    const allSessions = await sql`SELECT id, session_name, school_id FROM school_sessions`;
    console.log("All Sessions:", allSessions);

    const allPeriods = await sql`SELECT id, name, session_id, school_id FROM academic_periods`;
    console.log("All Periods:", allPeriods);

    // Try insert
    const result = await sql`
      INSERT INTO academic_periods (school_id, name, period_type, session_id, is_active)
      VALUES (9, '1er Semestres ', 'Semestre', 10, true)
      RETURNING *
    `;
    console.log("Insert successful:", result);
  } catch (err) {
    console.error("❌ Postgres Error Details:");
    console.error("  Message:", err.message);
    console.error("  Code:", err.code);
    console.error("  Detail:", err.detail);
    console.error("  Constraint:", err.constraint_name);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
